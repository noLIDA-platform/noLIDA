import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { typingSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/conversations/[id]/typing` — arm, clear, or READ the typing flag.
 *
 * The client POSTs `{ typing: true }` while keys are down (throttled to one
 * call per second; the flag expires server-side after 5s so a crashed tab
 * stops "typing" by itself) and DELETEs after 3s of silence or on send.
 * GET answers "is anyone else typing right now" for the chat's 1.5s poll —
 * it is deliberately a separate endpoint from GET `/api/conversations/[id]`,
 * which fetches the whole conversation and is far too heavy to poll.
 * A typing call never blocks or fails a message.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to use typing indicators.");

  const { id } = await params;

  // Own bucket, separate from the POST one: the open chat polls this every
  // 1.5s (~40/min), and sharing the POST counter would let normal typing
  // exhaust the armer's budget.
  const limit = checkRateLimit(`typing-read:${session.user.id}`, 240, 60_000);
  if (!limit.allowed) return ok({ typing: false, name: null });

  try {
    const result = await messagingService.getTypingStatus({
      userId: session.user.id,
      conversationId: id,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to use typing indicators.");

  const { id } = await params;

  const limit = checkRateLimit(`typing:${session.user.id}`, 240, 60_000);
  if (!limit.allowed) return ok({ typing: false });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = typingSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "That typing update could not be read.");
  }

  try {
    const result = await messagingService.setTyping({
      userId: session.user.id,
      conversationId: id,
      typing: parsed.data.typing,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to use typing indicators.");

  const { id } = await params;
  try {
    const result = await messagingService.setTyping({
      userId: session.user.id,
      conversationId: id,
      typing: false,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
