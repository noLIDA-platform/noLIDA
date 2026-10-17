import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { createGroupSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `POST /api/conversations/group` — create a group chat.
 *
 * Rate limited per user: this is the one endpoint where a signed-in user
 * can mint a conversation plus up to 255 membership rows per call.
 * Returns `{ conversation }` with 201, matching the 1:1 start route.
 */
export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to create a group.");

  const limit = checkRateLimit(`conversation-group:${session.user.id}`, 10, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are creating groups very fast. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That request could not be read.");
  }

  try {
    const conversation = await messagingService.createGroup({
      creatorId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      avatarUrl: parsed.data.avatarUrl ?? null,
      memberIds: parsed.data.memberIds,
    });
    return ok({ conversation }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}
