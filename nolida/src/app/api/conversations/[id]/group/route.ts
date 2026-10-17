import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";
import { updateGroupInfoSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `PATCH /api/conversations/[id]/group` — edit a group's name, description
 * or photo. Admin-only (enforced in the service); a member who is not an
 * admin gets FORBIDDEN, a non-member the same 404 the thread gives them.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to edit that group.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = updateGroupInfoSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "Those details could not be saved.");
  }

  try {
    const conversation = await messagingService.updateGroupInfo({
      conversationId: id,
      userId: session.user.id,
      ...parsed.data,
    });
    if (!conversation) return fail("NOT_FOUND", "That conversation was not found.");
    return ok({ conversation });
  } catch (error) {
    return handleServiceError(error);
  }
}
