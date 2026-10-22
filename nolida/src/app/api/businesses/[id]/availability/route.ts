import type { NextRequest } from "next/server";
import { getRequestSessionUser } from "@/lib/server/auth/route-session";
import { fail, ok } from "@/lib/server/api/response";
import { handleServiceError } from "@/lib/server/api/handle";
import {
  getAvailability,
  setAvailability,
} from "@/lib/server/services/availability.service";
import type { AvailabilitySlot } from "@/lib/availability/types";

export const runtime = "nodejs";

/**
 * `GET /api/businesses/[id]/availability`
 *
 * Public. Returns the weekly availability schedule for a business.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const schedule = await getAvailability({ businessId: id });
    return ok(schedule);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * `POST /api/businesses/[id]/availability`
 *
 * Owner only. Replaces the entire weekly schedule in one transaction.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getRequestSessionUser(request);
  if (!session)
    return fail("UNAUTHORIZED", "Sign in to edit your availability.");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_BODY", "Request body must be JSON.");
  }

  // Basic shape check — the service validates ownership.
  if (!Array.isArray(body)) {
    return fail("VALIDATION_ERROR", "Availability must be a list.");
  }

  const entries: AvailabilitySlot[] = body as AvailabilitySlot[];

  try {
    const updated = await setAvailability({
      businessId: id,
      userId: session.user.id,
      entries,
    });
    return ok(updated);
  } catch (error) {
    return handleServiceError(error);
  }
}
