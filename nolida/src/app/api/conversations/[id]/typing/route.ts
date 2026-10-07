import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { typingSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/conversations/[id]/typing` — arm or clear the typing flag.
 *
 * The client POSTs `{ typing: true }` while keys are down (the flag expires
 * server-side after 10s, so a crashed tab stops "typing" by itself) and
 * DELETEs on blur or send. A typing call never blocks or fails a message.
 */
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
