import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import {
  listResponses,
  respondToRequest,
} from "@/lib/server/services/request.service";
import {
  listResponsesQuerySchema,
  respondToRequestSchema,
} from "@/lib/server/validators/request";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";

export const runtime = "nodejs";

/**
 * `/api/requests/[id]/responses` — read offers, or send one.
 *
 * The business is resolved from the SESSION inside the service. There is no
 * `businessId` in the body, and there never should be: it would let any
 * signed-in user answer as any business in the database.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to send an offer.");

  const { id } = await params;

  const limit = checkRateLimit(`request-respond:${session.user.id}`, 60, 3_600_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are sending a lot of offers. Try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = respondToRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      "VALIDATION_ERROR",
      first?.message ?? "That offer could not be read.",
    );
  }

  try {
    const response = await respondToRequest({
      userId: session.user.id,
      requestId: id,
      message: parsed.data.message,
      priceEstimate: parsed.data.priceEstimate,
      availabilityNote: parsed.data.availabilityNote,
      attachments: parsed.data.attachments,
    });
    return ok({ response }, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * Read the offers on a request.
 *
 * The service decides what this returns: the owner sees all of them, and anyone
 * else sees only their own offer plus the count. That check is in the service and
 * the repository, not here — a route that filtered would be one somebody could
 * route around.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to see offers.");

  const { id } = await params;
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listResponsesQuerySchema.safeParse(query);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("VALIDATION_ERROR", first?.message ?? "That could not be read.");
  }

  try {
    const result = await listResponses({
      requestId: id,
      viewerId: session.user.id,
      limit: parsed.data.limit ?? FEED_PAGE_SIZE,
      cursor: parsed.data.cursor,
    });
    if (!result) return fail("NOT_FOUND", "That request was not found.");
    return ok(result);
  } catch (error) {
    return handleServiceError(error);
  }
}