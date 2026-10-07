import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import * as messagingService from "@/lib/server/services/messaging.service";
import { forwardSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `/api/messages/[id]/forward` — copy a message into other conversations.
 *
 * The route names targets, never content: what travels is decided by the
 * source row, so a forward cannot be used to smuggle text past validation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to forward messages.");

  const { id } = await params;

  const limit = checkRateLimit(`forward:${session.user.id}`, 30, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are forwarding very fast. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = forwardSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That forward could not be read.");
  }

  try {
    const result = await messagingService.forwardMessage({
      userId: session.user.id,
      messageId: id,
      conversationIds: parsed.data.conversationIds,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
