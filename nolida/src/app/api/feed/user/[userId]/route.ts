import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { getUserPosts } from "@/lib/server/services/feed.service";
import { pageQuerySchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/**
 * One user's posts.
 *
 * Visibility is applied by the same predicate as the home feed, so a private
 * post simply is not in the page — the route does not filter after loading,
 * because a filtered-out post must never have been read.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const { userId } = await context.params;

  const parsed = pageQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid page request.");

  const page = await getUserPosts({
    viewerId: session.user.id,
    userId,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  return ok(page);
}