import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { updateGlobalMessagingPrefs } from "@/lib/server/services/messaging.service";
import { messagingPrefsSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `PATCH /api/profiles/me/messaging-prefs` — the two global toggles on
 * `/settings/messaging`. No id in the path: the session IS the identity
 * (same reasoning as `PATCH /api/profiles/me`), so there is no authorisation
 * decision to get wrong — the request can only ever describe the caller.
 */
export async function PATCH(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = messagingPrefsSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "Those preferences could not be saved.");
  }

  try {
    const prefs = await updateGlobalMessagingPrefs(session.user.id, {
      ...(parsed.data.readReceipts !== undefined
        ? { readReceiptsEnabled: parsed.data.readReceipts }
        : {}),
      ...(parsed.data.typingIndicator !== undefined
        ? { typingIndicatorEnabled: parsed.data.typingIndicator }
        : {}),
    });
    return ok({ prefs });
  } catch (error) {
    return handleServiceError(error);
  }
}
