import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { AuthError } from "@/lib/server/services/auth.service";
import { requestBusinessAccess } from "@/lib/server/services/businessRequest.service";
import { businessRequestSchema } from "@/lib/server/validators/catalog";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";

export const runtime = "nodejs";

/**
 * `POST /api/businesses/request` — the in-app business request flow (Phase 7E).
 *
 * Takes the form body, generates and auto-redeems an authorization code, and
 * creates the user's DRAFT business — all in one transaction on the server.
 * The client never types or handles a code it did not just receive.
 *
 * Additive: `/api/businesses/redeem-code` is untouched and still serves
 * admin-issued codes.
 *
 * ## Rate limited
 *
 * This is the only unauthenticated-adjacent write in the business flow: any
 * signed-in user can create a business, a code and an audit row per call.
 * Without a cap, one signed-in account is an unbounded write amplifier — it
 * would spawn businesses and codes until the table fills or the unique slug
 * index starts thrashing. 10 per hour is far above real use and low enough to
 * make abuse visible.
 */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to list your business.");

  const limit = checkRateLimit(
    `business-request:${session.user.id}`,
    10,
    60 * 60 * 1000,
  );
  if (!limit.allowed) {
    return fail(
      "RATE_LIMITED",
      "You have requested several listings already. Try again later.",
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = businessRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Please check your details and try again.");
  }

  const { businessName, category, contactEmail, description } = parsed.data;
  // Empty strings mean "left blank", not "provided".
  const optional = (value: string | null | undefined): string | null =>
    value && value.trim().length > 0 ? value.trim() : null;

  try {
    const result = await requestBusinessAccess({
      userId: session.user.id,
      businessName,
      category: optional(category),
      contactEmail: optional(contactEmail),
      description: optional(description),
      ip: clientIp(request),
    });

    return ok({ code: result.code, businessId: result.businessId }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      // 409 for "you already have one": the request was well-formed and
      // understood, it conflicts with existing state. 400 would blame the
      // user's input for something they did not do wrong.
      if (error.code === "USER_ALREADY_HAS_BUSINESS") {
        return fail("USER_ALREADY_HAS_BUSINESS", error.message, 409);
      }
      if (error.code === "ACCOUNT_SUSPENDED") return fail("FORBIDDEN", error.message, 403);
      return fail("VALIDATION_ERROR", error.message);
    }
    throw error;
  }
}
