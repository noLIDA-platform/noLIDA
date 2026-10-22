import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { cancelBooking } from "@/lib/server/services/booking.service";

export const runtime = "nodejs";

/**
 * `POST /api/bookings/[id]/cancel`
 *
 * Customer or business owner cancels a PENDING/CONFIRMED booking.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to cancel a booking.");

  const { id } = await params;

  try {
    await cancelBooking({ userId: session.user.id, bookingId: id });
    return ok({ id, status: "CANCELLED" });
  } catch (error) {
    return handleServiceError(error);
  }
}
