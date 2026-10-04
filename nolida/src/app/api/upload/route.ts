/**
 * Fallback for browsers that can't do direct uploads. Prefer
 * /api/upload/signature + direct upload for speed.
 *
 * This route still buffers the whole file in server memory and makes two network
 * hops, which is why /create, the account page and both business editors no
 * longer call it. It is kept because a direct upload can fail for reasons that
 * are not our code's fault — a corporate proxy that blocks api.cloudinary.com, a
 * content blocker, an old browser — and "your photo will not upload" is a worse
 * outcome than "your photo uploads slowly".
 *
 * THE CLIENT DOES NOT FALL BACK TO THIS AUTOMATICALLY, and that is deliberate.
 * A CORS-blocked response does not mean the upload failed: the browser blocks
 * the RESPONSE, while the bytes have usually already reached Cloudinary and the
 * asset is stored. Retrying through this route would therefore re-send the whole
 * file and leave the first asset orphaned at the provider — turning a working
 * upload into a duplicated, half-visible one. A silent automatic retry is worse
 * than an honest error.
 *
 * So this is a route to reach deliberately (a support path, a diagnostic, or a
 * client's own retry on a failure that provably never reached the provider), not
 * a transparent fallback wired behind an error handler. It is also the last
 * remaining caller of `sniffMimeType`.
 */
import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { storage, StorageNotConfiguredError } from "@/lib/server/adapters/storage";
import {
  folderForPurpose,
  maxBytesFor,
  validateUpload,
  validateUploadBytes,
  type MediaKind,
} from "@/lib/server/validators/file.validator";

export const runtime = "nodejs";

/**
 * Videos are the slow case: a 50MB upload on a Nigerian mobile connection is
 * slow, and the default serverless timeout would cut it off mid-flight.
 */
export const maxDuration = 60;

/**
 * The one way into storage. Everything else — avatars, post media, business
 * photos, product images — goes through here.
 *
 * THREE checks stand between a request and a file at Cloudinary, in this order,
 * and the order matters:
 *
 *   1. Session. An anonymous request never reaches the file.
 *   2. Metadata (`validateUpload`): name, declared type, size. Cheap, and it
 *      rejects the obvious oversize before a single byte is buffered.
 *   3. Bytes (`validateUploadBytes`): magic numbers. This is the one that
 *      actually decides, because `File.type` is attacker-controlled and a
 *      renamed script passes every metadata rule.
 *
 * The file is held in memory, not written anywhere. 50MB of Buffer is the peak
 * per request, which is acceptable at this scale but is the reason the limit is
 * enforced BEFORE the read rather than after. For genuinely large files the fix
 * is a signed direct-to-Cloudinary upload (`generateAuthToken` + an upload
 * preset), which keeps bytes off this server entirely — that is the escape
 * hatch, not the next increment of the number below.
 */
export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to upload a file.");

  const limit = checkRateLimit(`upload:${session.user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are uploading very fast. Try again shortly.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("INVALID_BODY", "Send the file as multipart/form-data.");
  }

  const entry = form.get("file");
  if (!entry || typeof entry === "string") {
    return fail("VALIDATION_ERROR", "Attach a file to upload.");
  }

  // `File` from the platform, not a Node polyfill, so these three fields are
  // the real browser-supplied values — which is precisely why they are not
  // trusted until the bytes have been sniffed.
  const file: File = entry;

  const kindRaw = String(form.get("kind") ?? "image").toLowerCase();
  const kind: MediaKind = kindRaw === "video" ? "video" : "image";

  const purpose = String(form.get("purpose") ?? "post");
  const folder = folderForPurpose(purpose);
  if (!folder) {
    return fail("VALIDATION_ERROR", "Unknown upload purpose.");
  }

  // An avatar or a product photo is an image by definition. Accepting
  // `kind=video` for `purpose=avatar` would put a 50MB video in someone's
  // profile picture, so the folder decides the ceiling and the kind is checked
  // against it.
  if ((purpose === "avatar" || purpose === "business" || purpose === "product") && kind !== "image") {
    return fail("VALIDATION_ERROR", "Only posts may contain videos.");
  }

  const metadataError = validateUpload(
    { size: file.size, type: file.type, name: file.name },
    kind,
  );
  if (metadataError) {
    return fail(metadataError.code, metadataError.message);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return fail("INVALID_BODY", "That file could not be read.");
  }

  const bytesError = validateUploadBytes(
    buffer,
    { size: file.size, type: file.type, name: file.name },
    kind,
  );
  if (bytesError) {
    return fail(bytesError.code, bytesError.message);
  }

  try {
    const uploaded = await storage.uploadBuffer(buffer, {
      folder,
      resourceType: kind,
      maxBytes: maxBytesFor(kind),
    });

    return ok({
      url: uploaded.url,
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      resourceType: uploaded.resourceType,
      duration: uploaded.duration,
    });
  } catch (error) {
    // Missing credentials is an operator problem, not a user problem: say so
    // plainly rather than surfacing "Storage not configured" to someone who
    // just tried to add a photo.
    if (error instanceof StorageNotConfiguredError) {
      console.error("[upload] STORAGE_NOT_CONFIGURED:", error.message);
      return fail(
        "STORAGE_NOT_CONFIGURED",
        "Photo uploads are not available right now.",
        500,
      );
    }

    console.error("[upload] storage provider error:", error);
    return fail("UPLOAD_FAILED", "That upload did not finish. Try again.", 500);
  }
}