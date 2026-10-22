import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import { getAvailableSlots } from "@/lib/server/services/availability.service";

export const runtime = "nodejs";

/**
 * `GET /api/businesses/[id]/slots?date=YYYY-MM-DD&duration=60`
 *
 * Public. Returns the time slots a customer could book on a given date,
 * based on the business's weekly availability and existing bookings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const date = searchParams.get("date");
  const duration = searchParams.get("duration") ?? "60";

  if (!date) {
    return fail("INVALID", "A date parameter (YYYY-MM-DD) is required.");
  }

  const durationMinutes = parseInt(duration, 10);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
    return fail("INVALID", "Duration must be a positive number of minutes.");
  }

  try {
    const slots = await getAvailableSlots({
      businessId: id,
      date,
      durationMinutes,
    });
    return ok(slots);
  } catch (error) {
    return handleServiceError(error);
  }
}
