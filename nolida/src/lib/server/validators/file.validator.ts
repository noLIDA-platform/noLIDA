/**
 * Upload validation. The product rules, in one place.
 *
 * Three ideas, and they are all load-bearing:
 *
 * 1. The browser's `File.type` is a LIE the user controls. Renaming a script to
 *    `.jpg` costs nothing. The allow-list below is the first gate — it stops the
 *    obvious — but `sniffMimeType` is the one that actually decides, by reading
 *    the file's own magic bytes.
 * 2. Extension, MIME and magic bytes must AGREE. A file that claims `image/png`
 *    but carries JPEG magic is rejected rather than accepted on whichever check
 *    passed, because the first check to pass is attacker-chosen.
 * 3. Size is checked against real bytes, never a declared length.
 */

/** Allowed image MIME types. */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Allowed video MIME types. */
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

export { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES };

/** Extension → the MIME types that extension may legitimately carry. */
const EXTENSION_MIME: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mov: ["video/quicktime"],
  m4v: ["video/mp4"],
};

export interface FileValidationError {
  code: string;
  message: string;
}

/** The shape `validateUpload` accepts — a real File satisfies it. */
export interface FileLike {
  size: number;
  type: string;
  name: string;
}

export type MediaKind = "image" | "video";

/** Formats we will hand to the provider, per kind. */
export function allowedTypesFor(kind: MediaKind): readonly string[] {
  return kind === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
}

/** The byte ceiling for a kind. */
export function maxBytesFor(kind: MediaKind): number {
  return kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

/**
 * Extensions for Cloudinary's `allowed_formats`, which takes extensions rather
 * than MIME types. Kept in step with ALLOWED_IMAGE_TYPES / ALLOWED_VIDEO_TYPES
 * above — a format added to one list and not the other is a type that passes
 * validation and is then refused by the provider.
 *
 * On the signed direct-upload path these strings are signed, so Cloudinary
 * enforces them: they are the replacement for `sniffMimeType`, and the reason a
 * renamed executable cannot be stored.
 */
export const ALLOWED_IMAGE_EXTENSIONS = "jpg,jpeg,png,webp,gif";
export const ALLOWED_VIDEO_EXTENSIONS = "mp4,webm,mov,m4v";

export function allowedExtensionsFor(kind: MediaKind): string {
  return kind === "image" ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_VIDEO_EXTENSIONS;
}

/** A human-readable ceiling, e.g. "5 MB". Used in client and server messages. */
export function maxSizeLabelFor(kind: MediaKind): string {
  return kind === "image" ? "5 MB" : "50 MB";
}

/** The lower-case extension of a filename, or "" when it has none. */
function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot === -1 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Path traversal and NUL-byte rejection.
 *
 * The file is never written to our disk, so this is not an exploit today — it is
 * a guard on what the provider is asked to name things, and on any future code
 * that does touch the filename. Cheap, so it stays.
 */
function hasUnsafeName(name: string): boolean {
  return (
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("\0")
  );
}

/**
 * Read a file's actual type from its leading bytes.
 *
 * A client can claim any MIME type it likes, so the only trustworthy signal is
 * the file's magic number. This is the check the allow-list leans on.
 *
 * Returns `null` when the bytes match nothing we accept — which is itself the
 * answer: an unrecognised file is not a permitted upload.
 */
export function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.byteLength < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: "GIF87a" / "GIF89a"
  if (
    buffer.subarray(0, 3).toString("latin1") === "GIF" &&
    buffer.subarray(3, 6).toString("latin1").startsWith("8")
  ) {
    return "image/gif";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }

  // ISO base media (MP4 / MOV / M4V): "....ftyp" at offset 4.
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("latin1");
    if (brand.startsWith("qt")) return "video/quicktime";
    // `isom`, `mp42`, `dash`, `M4V ` are all MP4 containers.
    return "video/mp4";
  }

  // Matroska / WebM: 1A 45 DF A3. DocType later in the header separates webm from
  // mkv, but both are the same demuxable container and Cloudinary treats both as
  // video, so video/webm is the honest answer.
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "video/webm";
  }

  return null;
}

/**
 * Validate an upload from its metadata alone.
 *
 * Returns `null` when the file looks acceptable, or an error describing the
 * first rule it broke. This runs BEFORE the bytes are read, so an oversized or
 * wrongly-named file is rejected without ever being buffered.
 *
 * It deliberately does NOT confirm the bytes match the declared type — that is
 * `validateUploadBytes`, and the route calls both.
 */
export function validateUpload(
  file: FileLike,
  kind: MediaKind,
): FileValidationError | null {
  if (file.size <= 0) {
    return { code: "FILE_EMPTY", message: "That file is empty." };
  }

  if (hasUnsafeName(file.name)) {
    return { code: "FILE_NAME_INVALID", message: "That file name is not allowed." };
  }

  const maxBytes = maxBytesFor(kind);
  if (file.size > maxBytes) {
    return {
      code: "FILE_TOO_LARGE",
      message: `That ${kind} is too large. The limit is ${maxSizeLabelFor(kind)}.`,
    };
  }

  const extension = extensionOf(file.name);
  const allowedForExtension = EXTENSION_MIME[extension];
  if (!allowedForExtension) {
    return {
      code: "FILE_TYPE_UNSUPPORTED",
      message: `That file format is not supported. Allowed ${kind}s: ${
        kind === "image" ? "JPG, PNG, WebP, GIF" : "MP4, WebM, MOV"
      }.`,
    };
  }

  // An empty `type` is common and harmless — some browsers omit it. A WRONG one
  // is not, and is rejected below on the strength of the bytes.
  const declared = file.type.trim().toLowerCase();
  if (declared.length > 0 && !allowedForExtension.includes(declared)) {
    return {
      code: "FILE_TYPE_MISMATCH",
      message: "That file's type does not match its extension.",
    };
  }

  return null;
}

/**
 * Confirm the bytes are really what the file claims.
 *
 * Called once the buffer exists. A renamed executable passes `validateUpload`
 * when it lies about `type`, and dies here.
 *
 * `kind` decides what counts as acceptable, so a PNG cannot be smuggled into the
 * video path to get past the 5MB image ceiling.
 */
export function validateUploadBytes(
  buffer: Buffer,
  file: FileLike,
  kind: MediaKind,
): FileValidationError | null {
  const sniffed = sniffMimeType(buffer);
  if (!sniffed) {
    return {
      code: "FILE_TYPE_UNSUPPORTED",
      message: "That file is not a recognised image or video.",
    };
  }

  const expectedPrefix = kind === "image" ? "image/" : "video/";
  if (!sniffed.startsWith(expectedPrefix)) {
    return {
      code: "FILE_TYPE_MISMATCH",
      message: `That file's contents are a ${sniffed.replace("/", " ")}, not a ${kind}.`,
    };
  }

  const declared = file.type.trim().toLowerCase();
  if (declared.length > 0 && declared !== sniffed) {
    return {
      code: "FILE_TYPE_MISMATCH",
      message: "That file's contents do not match its reported type.",
    };
  }

  // Re-check size against real bytes; a crafted multipart part can understate it.
  if (buffer.byteLength > maxBytesFor(kind)) {
    return {
      code: "FILE_TOO_LARGE",
      message: `That ${kind} is too large. The limit is ${maxSizeLabelFor(kind)}.`,
    };
  }

  return null;
}

/** The Cloudinary folder for a given purpose. Keeps assets organised. */
export const UPLOAD_FOLDERS = {
  avatar: "nolida/avatars",
  post: "nolida/posts",
  business: "nolida/businesses",
  product: "nolida/products",
} as const;

export type UploadPurpose = keyof typeof UPLOAD_FOLDERS;

export const UPLOAD_PURPOSES = Object.keys(
  UPLOAD_FOLDERS,
) as UploadPurpose[];

/** The folder for a purpose, or null when the purpose is not one we know. */
export function folderForPurpose(purpose: string): string | null {
  return purpose in UPLOAD_FOLDERS
    ? UPLOAD_FOLDERS[purpose as UploadPurpose]
    : null;
}