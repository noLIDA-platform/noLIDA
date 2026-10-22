import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { getBookingForViewer } from "@/lib/server/services/booking.service";

export const runtime = "nodejs";

/**
 * `GET /api/bookings/[id]`
 *
 * Returns one booking if the viewer is the customer or the business owner.
 * Missing and unauthorized bookings both resolve to 404 — never leak that a
 * booking exists for someone who may not see it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session) return fail("UNAUTHORIZED", "Sign in to view this booking.");

  const { id } = await params;
  const booking = await getBookingForViewer(session.user.id, id);
  if (!booking) return fail("NOT_FOUND", "That booking was not found.");

  return ok(booking);
}
