import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { getHomeFeed } from "@/lib/server/services/feed.service";
import { pageQuerySchema } from "@/lib/server/validators/feed";

export const runtime = "nodejs";

/**
 * The home feed: posts the viewer may see, newest first, one page at a time.
 *
 * Returns `{ posts, nextCursor }`. A `nextCursor` of `null` is the page's own
 * way of saying "this is the end" — the client never has to guess from an empty
 * page, which costs one wasted request every time.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const parsed = pageQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid page request.");

  const page = await getHomeFeed({
    viewerId: session.user.id,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  return ok(page);
}