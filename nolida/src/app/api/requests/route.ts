import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import {
  createRequest,
  listRequests,
} from "@/lib/server/services/request.service";
import {
  createRequestSchema,
  listRequestsQuerySchema,
} from "@/lib/server/validators/request";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";

export const runtime = "nodejs";

/**
 * `/api/requests` — post a request, and read the open feed.
 *
 * POST and GET share a path because they are one resource: the collection, and
 * an item going into it.
 */
export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to post a request.");

  // Generous, not unlimited. A request is visible to every approved business on
  // the platform, so flooding one is both spam and a cost to everyone else.
  const limit = checkRateLimit(`request-create:${session.user.id}`, 10, 3_600_000);
  if (!limit.allowed) {
    return fail(
      "RATE_LIMITED",
      "You have posted a lot of requests. Try again later.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION_ERROR",
      first?.message ?? "That request could not be read.",
    );
  }

  try {
    const created = await createRequest({ userId: session.user.id, ...parsed.data });
    return ok({ request: created }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to see requests.");

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listRequestsQuerySchema.safeParse(params);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION_ERROR",
      first?.message ?? "Those filters could not be read.",
    );
  }

  try {
    const result = await listRequests({
      limit: parsed.data.limit ?? FEED_PAGE_SIZE,
      cursor: parsed.data.cursor,
      categoryId: parsed.data.categoryId,
      location: parsed.data.location,
      urgency: parsed.data.urgency,
    });
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}