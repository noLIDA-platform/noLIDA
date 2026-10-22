import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { markNoShow } from "@/lib/server/services/booking.service";

export const runtime = "nodejs";

/**
 * `POST /api/bookings/[id]/no-show`
 *
 * Business marks a CONFIRMED booking as NO_SHOW.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to mark a booking.");

  const { id } = await params;

  try {
    await markNoShow({ userId: session.user.id, bookingId: id });
    return ok({ id, status: "NO_SHOW" });
  } catch (error) {
    return handleServiceError(error);
  }
}
