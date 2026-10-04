import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type {
  SignedUpload,
  SignUploadOptions,
  StorageAdapter,
  UploadOptions,
  UploadResult,
} from "./storage.interface";

/**
 * Cloudinary storage adapter.
 *
 * This is the ONLY file in the app that knows Cloudinary exists. The upload
 * route imports `storage` from `./index`, never from here directly, so a
 * provider swap touches one file.
 *
 * Uploads are SIGNED: the browser never receives the API secret and never talks
 * to Cloudinary. Every file travels through our own `/api/upload`, where the
 * session is checked and the file is validated before a byte leaves us.
 */

/** Thrown when the three Cloudinary env vars are missing or blank. */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, " +
        "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
    this.name = "StorageNotConfiguredError";
  }
}

let configured = false;

/**
 * Configure once, lazily, and only when someone actually uploads.
 *
 * Configuring at module scope would make a missing credential surface on every
 * request that merely imports this module. Lazy config means a missing var is a
 * 500 on the upload endpoint and nothing anywhere else.
 */
function ensureConfigured(): void {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  // An empty string passes a naive truthiness check, so each is trimmed and
  // length-checked explicitly.
  if (!cloudName || !apiKey || !apiSecret) {
    throw new StorageNotConfiguredError();
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

/** Test seam: forget that we configured, so the next call re-reads env. */
export function resetCloudinaryConfig(): void {
  configured = false;
}

/**
 * Guarantee an https URL on the way out.
 *
 * Cloudinary returns `url` as `http://res.cloudinary.com/...` on many accounts
 * and `secure_url` as https. Every column we store this in is https-only, so
 * the provider boundary is the right place to normalise — otherwise each of the
 * four upload surfaces has to remember, and forgetting once surfaces as
 * "Media must be an https URL" after a perfectly successful upload.
 *
 * A non-http(s) value is returned unchanged so a malformed provider response
 * still fails loudly at the schema rather than being rewritten into something
 * that merely looks valid.
 */
function toSecure(url: string | undefined): string {
  if (!url) return "";
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

function toUploadResult(
  response: UploadApiResponse,
  fallbackType: "image" | "video",
): UploadResult {
  const isImage = (response.resource_type ?? fallbackType) === "image";
  return {
    url: response.url,
    // `secure_url` is the value to store. The `url` fallback is upgraded rather
    // than passed through, so an account with a missing `secure_url` still
    // produces an https asset instead of a validation error downstream.
    secureUrl: toSecure(response.secure_url ?? response.url),
    publicId: response.public_id,
    width: response.width ?? null,
    height: response.height ?? null,
    format: response.format ?? "",
    bytes: response.bytes ?? 0,
    resourceType: isImage ? "image" : "video",
    // Videos carry a fractional duration; images have none at all.
    duration: isImage ? null : (response.duration ?? null),
    isImage,
  };
}

export async function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<UploadResult> {
  ensureConfigured();

  const { folder, resourceType = "image", transformation, maxBytes } = options;

  // Re-checked here as well as in the route. The validator is the product rule;
  // this is the backstop for a caller that forgets it.
  if (maxBytes !== undefined && buffer.byteLength > maxBytes) {
    throw new Error(
      `File is ${buffer.byteLength} bytes, which exceeds the ${maxBytes} byte limit.`,
    );
  }

  // "auto" passes straight through: Cloudinary sniffs the bytes, which is more
  // reliable than the client-declared MIME type we refused to trust for the
  // allow-list decision.
  const resolvedType = resourceType === "auto" ? "auto" : resourceType;
  const fallbackType =
    resourceType === "auto" ? "image" : (resourceType as "image" | "video");

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resolvedType,
        transformation,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary returned no upload result."));
          return;
        }
        try {
          resolve(toUploadResult(result, fallbackType));
        } catch (mapError) {
          reject(mapError instanceof Error ? mapError : new Error(String(mapError)));
        }
      },
    );

    stream.end(buffer);
  });
}

export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "video" = "image",
): Promise<void> {
  ensureConfigured();
  // `invalidate: true` drops it from the CDN immediately rather than leaving a
  // cached copy reachable at a URL we believe we removed.
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

/**
 * Recover a `public_id` from a Cloudinary delivery URL.
 *
 * Needed when replacing a photo: the row holds a URL, and the provider needs the
 * id. Returns `null` for anything that is not one of our Cloudinary URLs, which
 * is the signal to NOT delete — a user's existing external avatar or an image
 * from some future provider must survive untouched.
 */
export function publicIdFromUrl(url: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return null;

  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const marker = `/${cloudName}/`;
  const index = pathname.indexOf(marker);
  if (index === -1) return null;

  const rest = pathname.slice(index + marker.length);
  // Strip the file extension. Public IDs may legitimately contain dots, so only a
  // known trailing extension is removed rather than everything after the last dot.
  const withoutExt = rest.replace(
    /\.(jpe?g|png|webp|gif|mp4|webm|mov|mp3|m4a)$/i,
    "",
  );
  return withoutExt || null;
}

/**
 * Authorise a direct browser-to-Cloudinary upload.
 *
 * The browser posts the file straight to Cloudinary; we only sign it. That drops
 * one network hop and the server-side buffer, which is worth a few hundred
 * milliseconds on an image and a great deal more on a 50MB video.
 *
 * THREE THINGS ARE LOAD-BEARING:
 *
 * 1. Cloudinary recomputes the signature from the fields it RECEIVES. A field
 *    that was signed but not sent, or sent with a different value, fails with
 *    "Invalid Signature" — so `params` is returned as the exact set to echo
 *    back, and the client sends every entry verbatim.
 * 2. `allowed_formats` is signed, which makes it enforced by Cloudinary rather
 *    than merely requested by us. That is what replaces the magic-byte sniffing
 *    the server-side path used to do: an `.exe` renamed to `.jpg` is refused by
 *    the provider before it is ever stored.
 * 3. Signatures live for one hour from `timestamp`, so one is minted per upload
 *    rather than cached. A stale signature is a support ticket, not an error the
 *    user can interpret.
 *
 * There is deliberately no size parameter here. Cloudinary's upload API has no
 * per-request byte ceiling (`max_file_size` does not exist — it is not in the
 * SDK's types, its JS, or its docs), so the size limit is a client-side courtesy
 * check plus the account's own plan limit. See docs/MEDIA.md.
 */
export function createSignedUpload(options: SignUploadOptions): SignedUpload {
  ensureConfigured();

  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";

  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: options.folder,
    allowed_formats: options.allowedFormats,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${options.resourceType}/upload`,
    // Stringified to match exactly what a multipart form field carries: a number
    // signed as `1738…` and sent as `"1738…"` is the same value, but building
    // both from one literal removes the question.
    params: {
      timestamp: String(timestamp),
      folder: options.folder,
      allowed_formats: options.allowedFormats,
    },
    allowedFormats: options.allowedFormats,
  };
}

export const cloudinaryAdapter: StorageAdapter = {
  name: "cloudinary",
  uploadBuffer,
  deleteAsset,
  createSignedUpload,
};