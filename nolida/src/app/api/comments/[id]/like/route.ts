import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import {
  likeComment,
  unlikeComment,
} from "@/lib/server/services/interaction.service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`like-comment:${session.user.id}`, 120, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  const { id } = await context.params;
  try {
    const result = await likeComment({
      userId: session.user.id,
      commentId: id,
    });
    return ok({ liked: true, ...result });
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

  const limit = checkRateLimit(`like-comment:${session.user.id}`, 120, 60_000);
  if (!limit.allowed) return fail("RATE_LIMITED", "Slow down a moment.");

  const { id } = await context.params;
  try {
    const result = await unlikeComment({
      userId: session.user.id,
      commentId: id,
    });
    return ok({ liked: false, ...result });
  } catch (error) {
    return handleServiceError(error);
  }
}