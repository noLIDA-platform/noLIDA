import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { likePost, unlikePost } from "@/lib/server/services/interaction.service";

export const runtime = "nodejs";

/** Likes a post. Idempotent: liking an already-liked post changes nothing. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`like:${session.user.id}`, 120, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  const { id } = await context.params;
  try {
    const counts = await likePost({ userId: session.user.id, postId: id });
    return ok({ liked: true, ...counts });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`like:${session.user.id}`, 120, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  const { id } = await context.params;
  try {
    const counts = await unlikePost({ userId: session.user.id, postId: id });
    return ok({ liked: false, ...counts });
  } catch (error) {
    return handleServiceError(error);
  }
}