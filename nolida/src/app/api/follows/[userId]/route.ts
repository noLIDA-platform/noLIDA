import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import {
  followUser,
  unfollowUser,
} from "@/lib/server/services/interaction.service";

export const runtime = "nodejs";

/**
 * Follows another account.
 *
 * The follower is always the session's user; the path names only the target.
 * That is what makes "follow on behalf of someone else" impossible to express,
 * rather than something the handler has to remember to forbid.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`follow:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  const { userId } = await context.params;
  try {
    const result = await followUser({
      followerId: session.user.id,
      followingId: userId,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`follow:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  const { userId } = await context.params;
  try {
    const result = await unfollowUser({
      followerId: session.user.id,
      followingId: userId,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}