import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import * as messagingService from "@/lib/server/services/messaging.service";

export const runtime = "nodejs";

/**
 * `/api/users/[id]/block` — block or unblock.
 *
 * Body-free: the target is the URL, so there is nothing to spoof in a
 * payload. The service checks self-blocking and existence; everything else
 * (sending, starting conversations, forwards) consults `user_blocks` before
 * any write.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to block someone.");

  const { id } = await params;
  try {
    const result = await messagingService.blockUser({
      userId: session.user.id,
      targetUserId: id,
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
  if (!session) return fail("UNAUTHORIZED", "Sign in to unblock someone.");

  const { id } = await params;
  try {
    const result = await messagingService.unblockUser({
      userId: session.user.id,
      targetUserId: id,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
