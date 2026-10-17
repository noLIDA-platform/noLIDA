import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";
import {
  addGroupMembersSchema,
  removeMemberQuerySchema,
} from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `POST /api/conversations/[id]/members` — add members (admin-only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to add members.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = addGroupMembersSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "Those members could not be added.");
  }

  try {
    const conversation = await messagingService.addGroupMembers({
      conversationId: id,
      userId: session.user.id,
      memberIds: parsed.data.memberIds,
    });
    if (!conversation) return fail("NOT_FOUND", "That conversation was not found.");
    return ok({ conversation });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * `DELETE /api/conversations/[id]/members?userId=` — remove a member
 * (admin-only; the last admin is refused in the service). The target rides
 * in the query string because DELETE bodies are not portable — curl, some
 * proxies and the Fetch spec itself treat them as unreliable.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to remove members.");

  const { id } = await params;

  const parsed = removeMemberQuerySchema.safeParse({
    userId: request.nextUrl.searchParams.get("userId"),
  });
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "That member could not be removed.");
  }

  try {
    const conversation = await messagingService.removeGroupMember({
      conversationId: id,
      userId: session.user.id,
      targetUserId: parsed.data.userId,
    });
    if (!conversation) return fail("NOT_FOUND", "That conversation was not found.");
    return ok({ conversation });
  } catch (error) {
    return handleServiceError(error);
  }
}
