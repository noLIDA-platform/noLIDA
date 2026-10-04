import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import {
  getOwnProfile,
  updateOwnProfile,
} from "@/lib/server/services/profile.service";
import { updateProfileSchema } from "@/lib/server/validators/profile";

export const runtime = "nodejs";

/**
 * The signed-in user's own profile.
 *
 * No id in the path: the session IS the identity. Nothing in the request can
 * name a different user, so there is no authorisation decision to get wrong
 * here — which is exactly why this endpoint exists instead of
 * `PATCH /api/profiles/[id]`.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  try {
    return ok({ profile: await getOwnProfile(session.user.id) });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION_ERROR",
      first?.message ?? "Those details could not be saved.",
    );
  }

  try {
    return ok({ profile: await updateOwnProfile(session.user.id, parsed.data) });
  } catch (error) {
    return handleServiceError(error);
  }
}