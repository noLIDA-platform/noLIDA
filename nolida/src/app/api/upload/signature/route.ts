import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import {
  storage,
  StorageNotConfiguredError,
  type SignedUpload,
} from "@/lib/server/adapters/storage";
import {
  allowedExtensionsFor,
  folderForPurpose,
} from "@/lib/server/validators/file.validator";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";

export const runtime = "nodejs";

/**
 * The signature endpoint: the only server involvement in an upload.
 *
 * It does not touch the file. It answers a question — "may this user write one
 * file of this kind?" — and the browser posts the bytes straight to Cloudinary.
 * That is one network hop instead of two and no server-side buffer, which is
 * what makes the difference between a 3MB photo taking two seconds and ten.
 *
 * What the client may choose is deliberately narrow: a purpose and a resource
 * type. The FOLDER and the FORMAT ALLOW-LIST are derived here from the purpose,
 * never read from the body. A body-supplied folder would be an open write to any
 * path in the Cloudinary account; a body-supplied allow-list would be no
 * allow-list at all.
 */

/** The purposes a client may request. Mirrors UPLOAD_FOLDERS. */
const PURPOSE_VALUES = [
  "avatar",
  "post",
  "business",
  "product",
  "request",
] as const;

const signatureRequestSchema = z.object({
  purpose: z.enum(PURPOSE_VALUES),
  resourceType: z.enum(["image", "video"]),
});



/** Vercel and most proxies put the caller's address first in the chain. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to upload a file.");

  // Higher than the byte-upload route's limit: a signature is cheap to mint, and
  // four parallel post uploads spend four of these in a burst. Still bounded,
  // because each one authorises a write to our provider account.
  const limit = checkRateLimit(`upload-sign:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are uploading very fast. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Send a JSON body.");
  }

  const parsed = signatureRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Choose a valid purpose and file type.");
  }

  const { purpose, resourceType } = parsed.data;

  const folder = folderForPurpose(purpose);
  if (!folder) return fail("VALIDATION_ERROR", "Unknown upload purpose.");

  if (
    (purpose === "avatar" ||
      purpose === "business" ||
      purpose === "product" ||
      purpose === "request") &&
    resourceType !== "image"
  ) {
    return fail("VALIDATION_ERROR", "Only posts may contain videos.");
  }

  let signed: SignedUpload;
  try {
    signed = storage.createSignedUpload({
      folder,
      resourceType,
      allowedFormats: allowedExtensionsFor(resourceType),
    });
  } catch (error) {
    // Missing credentials is an operator problem, not a user problem — the same
    // split `/api/upload` makes, so both endpoints fail identically.
    if (error instanceof StorageNotConfiguredError) {
      console.error("[upload/signature] STORAGE_NOT_CONFIGURED:", error.message);
      return fail(
        "STORAGE_NOT_CONFIGURED",
        "Photo uploads are not available right now.",
        500,
      );
    }
    console.error("[upload/signature] signing failed:", error);
    return fail(
      "UPLOAD_SIGNATURE_FAILED",
      "That upload could not be started. Try again.",
      500,
    );
  }

  // Audit AFTER the signature exists, and never let a failed audit deny an
  // upload the user is allowed to make. The event is still worth recording: it
  // is the only trace that a write was authorised, since the bytes never pass
  // through this server.
  try {
    await securityEventsRepo.log({
      userId: session.user.id,
      eventType: "UPLOAD_SIGNATURE_ISSUED",
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: { purpose, resourceType, userId: session.user.id },
    });
  } catch (error) {
    console.error("[upload/signature] audit write failed:", error);
  }

  return ok({
    signature: signed.signature,
    timestamp: signed.timestamp,
    apiKey: signed.apiKey,
    cloudName: signed.cloudName,
    uploadUrl: signed.uploadUrl,
    folder: signed.params.folder,
    resourceType,
    allowedFormats: signed.allowedFormats,
    // The contract the client actually depends on: every field here must be sent
    // back verbatim or Cloudinary rejects the upload as an invalid signature.
    params: signed.params,
  });
}
