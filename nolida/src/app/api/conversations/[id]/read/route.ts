import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";

export const runtime = "nodejs";

/**
 * `/api/conversations/[id]/read` — advance this viewer's read pointer.
 *
 * Called by an open thread on mount and whenever new messages land while
 * the window has focus. The pointer only moves forward (GREATEST in the
 * repo), so two devices cannot un-read each other.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to mark a conversation read.");

  const { id } = await params;

  // Chatty by design — every focused poll tick may call this — but bounded.
  const limit = checkRateLimit(`conversation-read:${session.user.id}`, 240, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Slow down a moment.");
  }

  try {
    const result = await messagingService.markConversationRead({
      userId: session.user.id,
      conversationId: id,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
