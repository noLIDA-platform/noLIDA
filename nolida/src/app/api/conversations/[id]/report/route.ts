import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";
import { reportConversationSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `POST /api/conversations/[id]/report` — report the whole conversation.
 * The response never reveals whether a report already exists; non-members
 * get the same 404 the thread gives them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to report that conversation.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = reportConversationSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "Choose a reason.");
  }

  try {
    const result = await messagingService.reportConversation({
      userId: session.user.id,
      conversationId: id,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
