import { cloudinaryAdapter } from "./cloudinary.adapter";
import type { StorageAdapter } from "./storage.interface";

export * from "./storage.interface";
export {
  publicIdFromUrl,
  resetCloudinaryConfig,
} from "./cloudinary.adapter";
export { StorageNotConfiguredError } from "./cloudinary.adapter";

/**
 * The one place the storage provider is chosen. Switch providers here.
 *
 * Everything else — `/api/upload`, the uploader component, the catalog and
 * profile services — imports `storage` and knows nothing about the provider
 * behind it. Moving to S3 or UploadThing is a new adapter implementing
 * `StorageAdapter`, then this one line.
 */
export const storage: StorageAdapter = cloudinaryAdapter;