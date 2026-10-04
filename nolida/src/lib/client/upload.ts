"use client";

/**
 * The client half of the upload contract.
 *
 * Client-side validation exists to give a fast answer, NOT to be trusted: every
 * rule here is re-checked against real bytes on the server-side fallback path,
 * and against a signed `allowed_formats` on the direct path. A user who bypasses
 * this file learns nothing they did not already know.
 *
 * Duplicated from the server's allow-list rather than imported, on purpose.
 * `file.validator.ts` is under `src/lib/server/`, and a Client Component may not
 * import from there. The duplication is the lesser evil — it is data, not logic,
 * and `docs/MEDIA.md` is what keeps the two lists honest.
 */

import { apiFetch } from "@/lib/client/api";

/** Kept in step with `file.validator.ts` ALLOWED_IMAGE_TYPES / _VIDEO_TYPES. */
export const CLIENT_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const CLIENT_ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** Kept in step with `file.validator.ts` MAX_IMAGE_BYTES / MAX_VIDEO_BYTES. */
export const CLIENT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CLIENT_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type UploadKind = "image" | "video";

/**
 * Where an asset belongs. The server turns this into a folder — the client never
 * names a path, because a client-named path is an open write to the whole
 * provider account.
 *
 * Declared here rather than in ImageUploader so both the uploader and the post
 * composer can use it without one importing the other.
 */
export type UploadPurposeName = "avatar" | "post" | "business" | "product";

/** What one successful upload gives back. Mirrors the server's UploadResult. */
export interface UploadedMedia {
  /** Always https by the time a caller sees it — corrected on resolve. */
  url: string;
  /**
   * The provider's secure URL. `/api/upload` returns both fields; `secureUrl` is
   * the one to store, because Cloudinary's plain `url` is `http://` on many
   * accounts and every media column in the app is https-only.
   */
  secureUrl: string;
  publicId: string;
  width: number | null;
  height: number | null;
  format: string;
  bytes: number;
  resourceType: "image" | "video";
  duration: number | null;
}

/** One item in a post's media array. */
export interface MediaItem {
  url: string;
  type: UploadKind;
}

/**
 * Force an http(s) URL to https, returning anything else untouched.
 *
 * Cloudinary's `url` is `http://res.cloudinary.com/...` on many accounts while
 * `secure_url` is always https. Four different surfaces upload through this
 * file (avatar, post media, business photos, product images) and every one of
 * their schemas is https-only, so a stray `http://` turns a successful upload
 * into "Media must be an https URL" on Publish — the Phase 5C.1 report.
 *
 * A non-http(s) value is returned as-is rather than rewritten: `javascript:`
 * must still fail loudly at the schema instead of being quietly turned into
 * something that merely looks valid.
 */
export function toHttpsUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

export function clientMaxBytes(kind: UploadKind): number {
  return kind === "image" ? CLIENT_MAX_IMAGE_BYTES : CLIENT_MAX_VIDEO_BYTES;
}

export function clientMaxLabel(kind: UploadKind): string {
  return kind === "image" ? "5 MB" : "50 MB";
}

export function clientAllowedTypes(kind: UploadKind): readonly string[] {
  return kind === "image"
    ? CLIENT_ALLOWED_IMAGE_TYPES
    : CLIENT_ALLOWED_VIDEO_TYPES;
}

/**
 * Check a file before sending it.
 *
 * Returns an error message, or `null` when the file looks acceptable. This is a
 * courtesy check: it saves the user a 30-second upload of a 60MB video only to be
 * told it is too large, and it does nothing that the server does not redo.
 */
export function checkFileForUpload(
  file: File,
  kind: UploadKind,
): string | null {
  const allowed = clientAllowedTypes(kind);

  if (file.size <= 0) return "That file is empty.";

  if (file.size > clientMaxBytes(kind)) {
    return `That ${kind} is larger than ${clientMaxLabel(kind)}.`;
  }

  // `accept` on the input already filters this in the picker, but a drag-and-drop
  // bypasses `accept` entirely, so it is checked here too.
  if (file.type && !allowed.includes(file.type as never)) {
    return kind === "image"
      ? "Photos must be JPG, PNG, WebP or GIF."
      : "Videos must be MP4, WebM or MOV.";
  }

  return null;
}

/**
 * Upload one file to `/api/upload`.
 *
 * Uses XMLHttpRequest rather than `fetch` for one reason: `fetch` has no upload
 * progress event. An `onProgress` callback lets the bar show real bytes sent,
 * which is the difference between "it is doing something" and "it is stuck".
 *
 * Returns the uploaded asset. Throws with a user-readable message on any
 * failure, so callers can surface `error.message` directly.
 */
export function uploadMediaFile(
  file: File,
  kind: UploadKind,
  purpose: string,
  onProgress?: (percent: number) => void,
): Promise<UploadedMedia> {
  return new Promise<UploadedMedia>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    form.append("purpose", purpose);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload");

    request.upload.addEventListener("progress", (event) => {
      if (!onProgress || !event.lengthComputable) return;
      // Capped at 90: the remaining 10% is the server validating and the
      // provider storing, which a client-side upload event cannot observe.
      onProgress(Math.min(90, Math.round((event.loaded / event.total) * 90)));
    });

    request.addEventListener("load", () => {
      let payload: unknown;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        reject(new Error("The upload did not finish. Try again."));
        return;
      }

      const body = payload as {
        ok?: boolean;
        data?: UploadedMedia;
        error?: { message?: string };
      };

      if (body.ok && body.data) {
        onProgress?.(100);
        // Normalised here, once, for every caller: a component that reads
        // `uploaded.url` instead of `uploaded.secureUrl` cannot go wrong.
        const canonical =
          body.data.secureUrl && body.data.secureUrl.length > 0
            ? body.data.secureUrl
            : body.data.url;
        const secure = toHttpsUrl(canonical);
        resolve({ ...body.data, url: secure, secureUrl: secure });
        return;
      }

      reject(
        new Error(
          body.error?.message ?? "That upload did not finish. Try again.",
        ),
      );
    });

    request.addEventListener("error", () => {
      reject(new Error("The upload failed. Check your connection and try again."));
    });

    // Fires for a 4xx/5xx as well as for an aborted request. `load` has already
    // handled the response-bearing case, so only the empty one lands here.
    request.addEventListener("abort", () => {
      reject(new Error("The upload was cancelled."));
    });

    request.send(form);
  });
}

/* ------------------------------------------------------------------ *
 * Direct-to-provider upload (Phase 5C.2)
 * ------------------------------------------------------------------ */

/** What the signature endpoint returns. Mirrors `SignedUpload` on the server. */
interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
  folder: string;
  resourceType: "image" | "video";
  allowedFormats: string;
  params: Record<string, string>;
}

/** The subset of Cloudinary's upload response we consume. */
interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
  error?: { message?: string };
}

export interface DirectUploadProgress {
  loaded: number;
  total: number;
  /** 0-100, from real bytes sent. Genuinely observed, not interpolated. */
  percent: number;
  /** 0 until there is enough elapsed time to be honest about it. */
  bytesPerSecond: number;
}

export interface DirectUploadOptions {
  purpose: UploadPurposeName;
  resourceType: UploadKind;
  onProgress?: (progress: DirectUploadProgress) => void;
  /** Cancels the in-flight upload. The promise rejects with a cancel message. */
  signal?: AbortSignal;
}

/**
 * Same shape as a server-side upload result, under the name the direct path
 * uses. One type, two names — deliberately not a second near-identical interface
 * that would drift from the first.
 */
export type DirectUploadResult = UploadedMedia;

/** Bytes per second, for the UI. Empty string when there is nothing to say. */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return "";
  const perSecond = bytesPerSecond / (1024 * 1024);
  if (perSecond >= 1) return `${perSecond.toFixed(1)} MB/s`;
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}

/**
 * Read a usable message out of a failed Cloudinary response.
 *
 * Cloudinary answers errors with `{ error: { message } }`. A proxy or a content
 * blocker will not, and an empty rejection reason is the least useful thing to
 * show someone whose upload just failed.
 */
function readUploadError(xhr: XMLHttpRequest): string {
  try {
    const parsed = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
    const message = parsed.error?.message;
    if (message && message.length > 0) return message;
  } catch {
    // Not JSON — fall through to the status-based message.
  }
  return `That upload failed (${xhr.status}). Try again.`;
}

/**
 * Upload one file DIRECTLY to Cloudinary.
 *
 * Flow: ask our own server for a signature (a few milliseconds, no file), post
 * the bytes straight to Cloudinary, done. The file never touches a NOlida
 * server, so there is no second hop and no server memory holding a 50MB buffer.
 *
 * WHY EVERY SIGNED PARAM IS SENT:
 * Cloudinary recomputes the signature from the fields it receives. A field that
 * was signed but not sent — or sent with a different value — is rejected as
 * "Invalid Signature". So the fields come from `signature.params` and are copied
 * across verbatim rather than listed by hand here; a hand-written list silently
 * breaks the day an extra param is signed.
 *
 * Returns the uploaded asset. Throws a user-readable Error on any failure, so
 * callers can surface `error.message` directly.
 */
export async function uploadDirect(
  file: File,
  options: DirectUploadOptions,
): Promise<DirectUploadResult> {
  const signatureResult = await apiFetch<SignatureResponse>(
    "/api/upload/signature",
    {
      method: "POST",
      body: {
        purpose: options.purpose,
        resourceType: options.resourceType,
      },
    },
  );

  if (!signatureResult.ok) {
    throw new Error(signatureResult.error.message);
  }

  const { signature, apiKey, uploadUrl, params } = signatureResult.data;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("signature", signature);
  // The exact signed set. Not `timestamp`/`folder` written out again — the
  // values that were signed, whatever they are.
  for (const [key, value] of Object.entries(params)) {
    form.append(key, value);
  }

  return new Promise<DirectUploadResult>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;
    let lastTotal = 0;
    const startedAt = Date.now();

    const settle = (action: () => void): void => {
      if (settled) return;
      settled = true;
      action();
    };

    // The caller may pass a signal that is ALREADY aborted — a cancel clicked in
    // the gap before this line would otherwise start an upload nobody can stop.
    if (options.signal?.aborted) {
      reject(new Error("The upload was cancelled."));
      return;
    }

    options.signal?.addEventListener(
      "abort",
      () => request.abort(),
      { once: true },
    );

    request.upload.addEventListener("progress", (event) => {
      if (!options.onProgress || !event.lengthComputable) return;
      lastTotal = event.total;
      const elapsed = (Date.now() - startedAt) / 1000;
      options.onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
        // Suppressed for the first fraction of a second: dividing by a
        // near-zero elapsed time reports an absurd number that flashes on
        // screen and reads like a bug.
        bytesPerSecond: elapsed > 0.25 ? Math.round(event.loaded / elapsed) : 0,
      });
    });

    request.addEventListener("load", () => {
      if (request.status < 200 || request.status >= 300) {
        settle(() => reject(new Error(readUploadError(request))));
        return;
      }

      let data: CloudinaryUploadResponse;
      try {
        data = JSON.parse(request.responseText) as CloudinaryUploadResponse;
      } catch {
        settle(() =>
          reject(
            new Error("The upload finished but the response was unreadable."),
          ),
        );
        return;
      }

      settle(() => {
        options.onProgress?.({
          loaded: lastTotal,
          total: lastTotal,
          percent: 100,
          bytesPerSecond: 0,
        });

        // `secure_url` is what gets stored. `toHttpsUrl` covers the account
        // where Cloudinary omits it — the Phase 5C.1 bug, fixed at every layer
        // so a future caller reading either field is still correct.
        const secure = toHttpsUrl(data.secure_url ?? data.url);

        resolve({
          url: secure,
          secureUrl: secure,
          publicId: data.public_id ?? "",
          width: data.width ?? null,
          height: data.height ?? null,
          format: data.format ?? "",
          bytes: data.bytes ?? 0,
          resourceType: options.resourceType,
          duration: data.duration ?? null,
        });
      });
    });

    request.addEventListener("error", () => {
      settle(() =>
        reject(
          new Error(
            "The upload could not reach the file service. Check your connection and try again.",
          ),
        ),
      );
    });

    request.addEventListener("abort", () => {
      settle(() => reject(new Error("The upload was cancelled.")));
    });

    request.open("POST", uploadUrl);
    request.send(form);
  });
}