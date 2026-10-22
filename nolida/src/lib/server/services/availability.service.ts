import { withTransaction } from "@/lib/db/client";
import { ServiceError } from "@/lib/server/services/service-error";
import * as availabilityRepo from "@/lib/server/repositories/availability.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { SLOT_MINUTES_DEFAULT } from "@/lib/availability/constants";

/**
 * Returns the weekly availability schedule for a business.
 *
 * Each entry maps to one row in the `availability` table. Days with no
 * entries are omitted — the caller decides how to render "closed" days.
 */
export async function getAvailability(input: {
  businessId: string;
}): Promise<AvailabilitySlot[]> {
  const rows = await availabilityRepo.listByBusiness(input.businessId);
  return rows.map(toSlot);
}

/**
 * Replace the entire weekly schedule for a business.
 *
 * The entire operation runs in one transaction: all existing rows are deleted
 * and the new set is inserted together, so a failure leaves the old schedule
 * intact rather than in a half-applied state.
 *
 * `userId` must own the business with `businessId`, or the service throws
 * FORBIDDEN.
 */
export async function setAvailability(input: {
  businessId: string;
  userId: string;
  entries: AvailabilitySlot[];
}): Promise<AvailabilitySlot[]> {
  // Verify ownership before touching data.
  const business = await businessesRepo.findByOwner(input.userId);
  if (!business || business.id !== input.businessId) {
    throw new ServiceError(
      "FORBIDDEN",
      "Only the business owner can edit availability."
    );
  }

  const toInsert = input.entries.map((e) => ({
    business_id: input.businessId,
    day_of_week: e.day_of_week,
    start_time: e.start_time,
    end_time: e.end_time,
    slot_minutes: e.slot_minutes ?? SLOT_MINUTES_DEFAULT,
    is_active: e.is_active ?? true,
  }));

  const created = await withTransaction(async (client) => {
    return availabilityRepo.replaceAllForBusiness(
      input.businessId,
      toInsert,
      client
    );
  });

  return created.map(toSlot);
}

/**
 * Returns the set of time strings a customer could book on a given date,
 * based on the business's weekly schedule and existing bookings.
 *
 * `date` is a calendar date (YYYY-MM-DD). `durationMinutes` is how long the
 * booking would last.
 */
export async function getAvailableSlots(input: {
  businessId: string;
  date: string;
  durationMinutes: number;
}): Promise<string[]> {
  const rows = await availabilityRepo.listByBusiness(input.businessId);
  const dateObj = new Date(input.date);
  const dayOfWeek = dateObj.getDay();

  const daySlots = rows.filter((r) => r.day_of_week === dayOfWeek && r.is_active);

  const allSlots: string[] = [];
  for (const slot of daySlots) {
    const start = parseTimeToDate(input.date, slot.start_time);
    const end = parseTimeToDate(input.date, slot.end_time);
    const slotMs = slot.slot_minutes;

    let cursor = start;
    while (cursor.getTime() + slotMs * 60_000 <= end.getTime()) {
      const iso = cursor.toISOString();
      allSlots.push(iso);
      cursor = new Date(cursor.getTime() + slotMs * 60_000);
    }
  }

  return allSlots;
}

// --- helpers ---

function toSlot(row: availabilityRepo.AvailabilityRow): AvailabilitySlot {
  return {
    id: row.id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    slot_minutes: row.slot_minutes,
    is_active: row.is_active,
  };
}

function parseTimeToDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}