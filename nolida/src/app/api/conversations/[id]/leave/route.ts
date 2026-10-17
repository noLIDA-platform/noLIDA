import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";

export const runtime = "nodejs";

/**
 * `POST /api/conversations/[id]/leave` — leave a group. When the leaver was
 * the last member the group row itself is gone, and `deleted` tells the
 * client so it navigates away instead of back to a thread that no longer
 * renders. Leaving is idempotent: a second tap finds no membership row and
 * the service 404s, which the client treats as already-gone.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to leave that group.");

  const { id } = await params;
  try {
    const result = await messagingService.leaveGroup({
      conversationId: id,
      userId: session.user.id,
    });
    if (!result) return ok({ left: true, deleted: true });
    return ok({ left: true, deleted: false });
  } catch (error) {
    return handleServiceError(error);
  }
}
