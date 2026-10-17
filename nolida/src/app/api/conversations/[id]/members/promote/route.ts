import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";
import { promoteMemberSchema } from "@/lib/server/validators/messaging";

export const runtime = "nodejs";

/**
 * `POST /api/conversations/[id]/members/promote` — make a member an admin.
 * Admin-only, and promoting someone who is already an admin is a no-op
 * handled by the service (never an error — two devices, one tap).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to promote members.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = promoteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "That member could not be promoted.");
  }

  try {
    const conversation = await messagingService.makeGroupAdmin({
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
