import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { rescheduleBooking } from "@/lib/server/services/booking.service";
import { bookingRescheduleSchema } from "@/lib/server/validators/booking";

export const runtime = "nodejs";

/**
 * `POST /api/bookings/[id]/reschedule`
 *
 * Customer or business owner reschedules a PENDING/CONFIRMED/RESCHEDULED
 * booking to a new scheduled_at. The new time must not conflict with
 * another active booking for the same business.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to reschedule a booking.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  const parsed = bookingRescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Please check your details and try again.");
  }

  try {
    const booking = await rescheduleBooking({
      userId: session.user.id,
      bookingId: id,
      newScheduledAt: parsed.data.scheduledAt,
    });
    return ok(booking);
  } catch (error) {
    return handleServiceError(error);
  }
}
