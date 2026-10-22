import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { completeBooking } from "@/lib/server/services/booking.service";

export const runtime = "nodejs";

/**
 * `POST /api/bookings/[id]/complete`
 *
 * Business completes a CONFIRMED booking. CONFIRMED -> COMPLETED.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to complete a booking.");

  const { id } = await params;

  try {
    await completeBooking({ userId: session.user.id, bookingId: id });
    return ok({ id, status: "COMPLETED" });
  } catch (error) {
    return handleServiceError(error);
  }
}
