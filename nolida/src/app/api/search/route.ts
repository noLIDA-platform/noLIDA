import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { search } from "@/lib/server/services/search.service";
import { searchQuerySchema } from "@/lib/server/validators/search";

export const runtime = "nodejs";

/**
 * Search across posts and people.
 *
 * Rate limited because full-text search over a growing corpus is the most
 * expensive read in the app; a scripted client could otherwise turn a search
 * box into a load test. Per session rather than per IP, so a shared office
 * connection does not lock everyone out.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`search:${session.user.id}`, 120, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many searches. Wait a moment.");
  }

  const params = request.nextUrl.searchParams;

  // Missing and blank are the same problem: there is nothing to search for.
  // `/api/discovery` is the answer for "no query yet", not an empty search.
  const raw = params.get("q");
  if (!raw || raw.trim().length === 0) {
    return fail("MISSING_QUERY", "Type something to search for.", 400);
  }

  const parsed = searchQuerySchema.safeParse({
    q: raw,
    type: params.get("type") ?? undefined,
    location: params.get("location") ?? undefined,
    sortBy: params.get("sortBy") ?? undefined,
    limit: params.get("limit") ?? undefined,
    offset: params.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "That search does not look right.");
  }

  try {
    const results = await search({
      viewerId: session.user.id,
      query: parsed.data.q,
      type: parsed.data.type,
      location: parsed.data.location,
      sortBy: parsed.data.sortBy,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return ok(results);
  } catch (error) {
    return handleServiceError(error);
  }
}