import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { createFromResponse, listBookingsForBusiness, listBookingsForCustomer } from "@/lib/server/services/booking.service";
import { bookingCreateSchema } from "@/lib/server/validators/booking";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(value: string | null): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * `GET /api/bookings`
 *
 * Lists the session user's bookings. Defaults to the customer's own bookings;
 * `?role=business` lists the bookings for the user's APPROVED business.
 */
export async function GET(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to view your bookings.");

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? "customer";
  const limit = parseLimit(searchParams.get("limit"));
  const cursor = searchParams.get("cursor") ?? null;

  if (role === "business") {
    const page = await listBookingsForBusiness({
      userId: session.user.id,
      limit,
      cursor,
    });
    return ok(page);
  }

  const page = await listBookingsForCustomer({
    userId: session.user.id,
    limit,
    cursor,
  });
  return ok(page);
}

/**
 * `POST /api/bookings`
 *
 * Creates a booking from an accepted request response. The customer (request
 * owner) books the business that made the accepted offer.
 */
export async function POST(request: NextRequest) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to create a booking.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = bookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Please check your details and try again.");
  }

  try {
    const booking = await createFromResponse({
      userId: session.user.id,
      responseId: parsed.data.responseId,
      scheduledAt: parsed.data.scheduledAt ?? null,
      notes: parsed.data.notes ?? null,
    });
    return ok(booking, 201);
  } catch (error) {
    return handleServiceError(error);
  }
}
