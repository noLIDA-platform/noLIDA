import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { getSavedPosts } from "@/lib/server/services/feed.service";
import { pageQuerySchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/**
 * The viewer's saved posts.
 *
 * There is no `userId` in the path on purpose: a saved list belongs to the
 * person who saved it, so it is always the session's user. Asking for someone
 * else's saves is not a permission question — the route cannot express it.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const parsed = pageQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid page request.");

  const page = await getSavedPosts({
    userId: session.user.id,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  return ok(page);
}