import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { getDiscoveryData } from "@/lib/server/services/search.service";

export const runtime = "nodejs";

/**
 * What `/discover` shows before anyone types anything: trending posts, people
 * to follow, recent activity.
 *
 * Separate from `/api/search` so that "no query" is a first-class answer with
 * its own shape, rather than an empty result set the client has to special-case.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to continue.");

  const limit = checkRateLimit(`discovery:${session.user.id}`, 60, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many requests. Wait a moment.");
  }

  try {
    const data = await getDiscoveryData(session.user.id);
    return ok(data);
  } catch (error) {
    return handleServiceError(error);
  }
}