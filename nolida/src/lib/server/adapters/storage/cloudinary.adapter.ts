import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type {
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

function toUploadResult(
  response: UploadApiResponse,
  fallbackType: "image" | "video",
): UploadResult {
  const isImage = (response.resource_type ?? fallbackType) === "image";
  return {
    url: response.url,
    secureUrl: response.secure_url ?? response.url,
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

export const cloudinaryAdapter: StorageAdapter = {
  name: "cloudinary",
  uploadBuffer,
  deleteAsset,
};