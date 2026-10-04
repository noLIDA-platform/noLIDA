/**
 * The storage contract every provider satisfies.
 *
 * The interface exists so that swapping Cloudinary for S3, UploadThing or a
 * NOlida-hosted bucket later is a change to `index.ts` alone. Callers — the
 * upload route, the uploader component — depend on these two functions and
 * nothing about HTTP, signatures or public IDs leaks into them.
 *
 * `UploadResult` is what gets persisted: only URLs and dimensions. No file ever
 * touches our filesystem or our database as bytes.
 */

export interface UploadResult {
  /** http(s) URL, for `<img src>`. Prefer `secureUrl` in production. */
  url: string;
  /** https URL. What the API hands back and what we store. */
  secureUrl: string;
  /** Provider-asset handle. Needed to delete or transform later. */
  publicId: string;
  width: number | null;
  height: number | null;
  format: string;
  bytes: number;
  resourceType: "image" | "video";
  /** Seconds. Videos only; `null` for images. */
  duration: number | null;
  /** True when Cloudinary stored this as an image (`f_auto` / `q_auto` ready). */
  isImage: boolean;
}

export interface UploadOptions {
  /** Provider folder, e.g. `nolida/avatars`. Omit for the provider root. */
  folder?: string;
  /** Force a resource type. "auto" lets the provider sniff. */
  resourceType?: "image" | "video" | "auto";
  /** Provider-specific transformations, passed through untouched. */
  transformation?: object[];
  /** Hard byte ceiling, re-checked server-side before we call the provider. */
  maxBytes?: number;
  /** MIME types to accept. Defaults to the image allow-list. */
  allowedFormats?: string[];
}

export interface StorageAdapter {
  readonly name: string;
  uploadBuffer(buffer: Buffer, options?: UploadOptions): Promise<UploadResult>;
  deleteAsset(
    publicId: string,
    resourceType?: "image" | "video",
  ): Promise<void>;
}