import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { deletePost, updatePost } from "@/lib/server/services/post.service";
import { getPostForViewer } from "@/lib/server/services/feed.service";
import { updatePostSchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/**
 * A single post, with the viewer's `liked`/`saved` flags.
 *
 * A post the viewer may not see is a 404, not a 403: telling someone that a
 * private post exists but is off-limits is itself a disclosure.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const { id } = await context.params;
  const post = await getPostForViewer({ viewerId: session.user.id, postId: id });
  if (!post) return fail("NOT_FOUND", "That post is not available.");

  return ok({ post });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`post-edit:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many edits. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "A post needs between 1 and 5000 characters.");
  }

  const { id } = await context.params;
  try {
    const post = await updatePost({
      userId: session.user.id,
      postId: id,
      body: parsed.data.body,
    });
    return ok({ post });
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

  const { id } = await context.params;
  try {
    await deletePost({ userId: session.user.id, postId: id });
    return ok({ deleted: true });
  } catch (error) {
    return handleServiceError(error);
  }
}