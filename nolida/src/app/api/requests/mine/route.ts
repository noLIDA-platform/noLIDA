import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { listMyRequests } from "@/lib/server/services/request.service";
import { listMineQuerySchema } from "@/lib/server/validators/request";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";

export const runtime = "nodejs";

/**
 * `/api/requests/mine` — everything the signed-in person asked for.
 *
 * Scoped to the session, with no id in the path and none in the query: there is
 * no identifier here a caller could tamper with to read somebody else's list.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to see your requests.");

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listMineQuerySchema.safeParse(params);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION_ERROR",
      first?.message ?? "Those filters could not be read.",
    );
  }

  try {
    const result = await listMyRequests({
      userId: session.user.id,
      limit: parsed.data.limit ?? FEED_PAGE_SIZE,
      cursor: parsed.data.cursor,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}