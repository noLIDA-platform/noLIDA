/**
 * The client half of the upload contract.
 *
 * Client-side validation exists to give a fast answer, NOT to be trusted: every
 * rule here is re-checked on the server against real bytes. A user who bypasses
 * this file learns nothing they did not already know, because
 * `file.validator.ts` decides.
 *
 * Duplicated from the server's allow-list rather than imported, on purpose.
 * `file.validator.ts` is under `src/lib/server/`, and a Client Component may not
 * import from there. The duplication is the lesser evil — it is data, not logic,
 * and the test in `docs/MEDIA.md` is what keeps the two lists honest.
 */

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

/** What one successful upload gives back. Mirrors the server's UploadResult. */
export interface UploadedMedia {
  url: string;
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
        resolve(body.data);
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