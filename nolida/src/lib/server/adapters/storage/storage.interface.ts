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

export interface SignUploadOptions {
  /**
   * Provider folder. ALWAYS derived server-side from the purpose — a folder
   * taken from the request body would let any signed-in user write anywhere in
   * the provider account.
   */
  folder: string;
  resourceType: "image" | "video";
  /** Comma-separated extension allow-list, enforced by the provider. */
  allowedFormats: string;
}

/**
 * Everything the browser needs to upload one file straight to the provider.
 *
 * `params` is the authoritative set of fields the client must send back, and it
 * is the whole reason this type exists. The provider recomputes the signature
 * from the fields it RECEIVES, so a signed field that is not sent — or is sent
 * with a different value — is rejected as `Invalid Signature`, not tolerated.
 * Iterating `params` keeps the two sides in step by construction; a hand-written
 * list of field names in the client would drift the moment a param is added.
 *
 * `resource_type`, `api_key`, `file` and `signature` are deliberately absent:
 * the provider excludes them from signing because they travel in the path or are
 * not part of the signed payload.
 */
export interface SignedUpload {
  signature: string;
  /** Unix seconds. The signature is accepted for one hour after this. */
  timestamp: number;
  apiKey: string;
  cloudName: string;
  /** Fully-qualified endpoint: .../v1_1/<cloud>/<resourceType>/upload */
  uploadUrl: string;
  /** The exact fields that were signed. Send every one of them, unchanged. */
  params: Record<string, string>;
  /** Echoed for the UI only; the provider is what enforces it. */
  allowedFormats: string;
}

export interface StorageAdapter {
  readonly name: string;
  uploadBuffer(buffer: Buffer, options?: UploadOptions): Promise<UploadResult>;
  deleteAsset(
    publicId: string,
    resourceType?: "image" | "video",
  ): Promise<void>;
  /**
   * Authorise a direct browser-to-provider upload.
   *
   * Synchronous by design: signing is local HMAC work with no network call, so
   * the endpoint that wraps it answers in a few milliseconds.
   */
  createSignedUpload(options: SignUploadOptions): SignedUpload;
}