import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { closeRequest } from "@/lib/server/services/request.service";
import { closeRequestSchema } from "@/lib/server/validators/request";

export const runtime = "nodejs";

/**
 * `POST /api/requests/[id]/close` — CLOSED, CANCELLED or FULFILLED.
 *
 * Owner only, and only while the request still accepts offers. Closing twice is
 * a refusal rather than a silent success: the second call is almost certainly a
 * double-tap, and "already closed" is the truth.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to close this request.");

  const { id } = await params;

  // A close is one per request, so this is about a double-tap rather than
  // volume. Kept anyway: it costs nothing and a retry loop would otherwise be
  // able to churn the audit log.
  const limit = checkRateLimit(`request-close:${session.user.id}`, 60, 3_600_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "You are doing that very fast. Try again shortly.");
  }

  let body: unknown = {};
  try {
    const raw = await request.text();
    // An empty body is legitimate here: "close it" needs no payload.
    if (raw.trim().length > 0) body = JSON.parse(raw);
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = closeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "That request could not be read.");
  }

  try {
    const updated = await closeRequest({
      userId: session.user.id,
      requestId: id,
      status: parsed.data.status,
    });
    return ok({ request: updated });
  } catch (error) {
    return handleServiceError(error);
  }
}