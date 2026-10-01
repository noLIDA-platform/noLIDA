import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { commentOnPost } from "@/lib/server/services/interaction.service";
import * as postCommentsRepo from "@/lib/server/repositories/postComments.repo";
import { createCommentSchema, pageQuerySchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/** A page of comments, oldest first. Public to any signed-in viewer. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const parsed = pageQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid page request.");

  const { id } = await context.params;
  const page = await postCommentsRepo.listByPost({
    postId: id,
    limit: parsed.data.limit ?? 20,
    cursor: parsed.data.cursor,
  });

  return ok(page);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`comment:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are commenting very fast. Try again shortly.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "A comment needs between 1 and 2000 characters.");
  }

  const { id } = await context.params;
  try {
    const result = await commentOnPost({
      userId: session.user.id,
      postId: id,
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
    });
    return ok(result, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}