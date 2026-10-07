import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { reactSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/messages/[id]/reactions` — set your reaction (POST) or clear it
 * (DELETE). One reaction per member per message, so DELETE needs no emoji:
 * it removes whatever the caller currently holds.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to react to messages.");

  const { id } = await params;

  const limit = checkRateLimit(`reaction:${session.user.id}`, 120, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many reactions. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = reactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That reaction could not be read.");
  }

  try {
    const message = await messagingService.addReaction({
      userId: session.user.id,
      messageId: id,
      emoji: parsed.data.emoji,
    });
    return ok({ message });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to react to messages.");

  const { id } = await params;
  try {
    const message = await messagingService.removeReaction({
      userId: session.user.id,
      messageId: id,
    });
    return ok({ message });
  } catch (error) {
    return handleServiceError(error);
  }
}
