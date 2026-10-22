import { withTransaction } from "@/lib/db/client";
import { ServiceError } from "@/lib/server/services/service-error";
import * as bookingsRepo from "@/lib/server/repositories/bookings.repo";
import * as businessesRepo from "@/lib/server/repositories/businesses.repo";
import * as requestsRepo from "@/lib/server/repositories/requests.repo";
import * as requestResponsesRepo from "@/lib/server/repositories/requestResponses.repo";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";
import type { BookingRow } from "@/lib/server/repositories/bookings.repo";
import { DEFAULT_CURRENCY, MAX_NOTES_LEN } from "@/lib/bookings/constants";

export interface CreateFromResponseInput {
  userId: string;
  responseId: string;
  scheduledAt?: string | null;
  notes?: string | null;
}

export interface BookingActionInput {
  userId: string;
  bookingId: string;
}

export interface ListBookingsInput {
  userId: string;
  limit?: number;
  cursor?: string | null;
}

const CANCELLABLE_STATUSES: readonly string[] = ["PENDING", "CONFIRMED"];
const RESCHEDULABLE_STATUSES: readonly string[] = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULED",
];

export async function createFromResponse(
  input: CreateFromResponseInput
): Promise<BookingRow> {
  const response = await requestResponsesRepo.findById(input.responseId);
  if (!response) throw new ServiceError("NOT_FOUND", "That offer was not found.");
  if (response.status !== "ACCEPTED") {
    throw new ServiceError(
      "INVALID",
      "You can only book an offer that has been accepted."
    );
  }

  const request = await requestsRepo.findById(response.request_id);
  if (!request) throw new ServiceError("NOT_FOUND", "That request was not found.");
  if (request.user_id !== input.userId) {
    throw new ServiceError("FORBIDDEN", "That is not your request.");
  }

  const already = await bookingsRepo.hasBookingForResponse({
    responseId: input.responseId,
  });
  if (already) {
    throw new ServiceError("INVALID", "This offer has already been booked.");
  }

  if (response.business_id == null) {
    throw new ServiceError(
      "INVALID",
      "This offer is not linked to a business and cannot be booked."
    );
  }
  const businessId = response.business_id!;
  if (response.price_estimate == null) {
    throw new ServiceError("INVALID", "This offer has no price to book.");
  }
  const priceMinor = Math.round(response.price_estimate * 100);

  let notes = input.notes ?? null;
  if (notes != null) {
    notes = notes.trim();
    if (notes.length > MAX_NOTES_LEN) {
      throw new ServiceError(
        "INVALID",
        `Notes must be ${MAX_NOTES_LEN} characters or fewer.`
      );
    }
    if (notes.length === 0) notes = null;
  }

  return withTransaction(async (client) => {
    const created = await bookingsRepo.create(
      {
        requestId: request.id,
        responseId: response.id,
        customerId: input.userId,
        businessId,
        priceMinor,
        currency: response.currency ?? DEFAULT_CURRENCY,
        scheduledAt: input.scheduledAt ?? null,
        notes,
      },
      client
    );

    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BOOKING_CREATED",
        metadata: {
          bookingId: created.id,
          requestId: request.id,
          responseId: response.id,
          businessId: response.business_id,
          priceMinor,
        },
      },
      client
    );

    return created;
  });
}

async function requireBooking(bookingId: string): Promise<BookingRow> {
  const booking = await bookingsRepo.findById(bookingId);
  if (!booking) throw new ServiceError("NOT_FOUND", "That booking was not found.");
  return booking;
}

async function requireBusinessOwner(
  userId: string,
  businessId: string | null
): Promise<void> {
  if (businessId == null) {
    throw new ServiceError("FORBIDDEN", "That booking has no business to act on.");
  }
  const business = await businessesRepo.findByOwner(userId);
  if (!business || business.id !== businessId) {
    throw new ServiceError("FORBIDDEN", "That is not your business.");
  }
}

async function isBusinessOwner(userId: string, businessId: string | null): Promise<boolean> {
  if (businessId == null) return false;
  const business = await businessesRepo.findByOwner(userId);
  return !!business && business.id === businessId;
}

export async function confirmBooking(input: BookingActionInput): Promise<void> {
  const booking = await requireBooking(input.bookingId);
  if (booking.status !== "PENDING") {
    throw new ServiceError("INVALID", "Only a pending booking can be confirmed.");
  }
  await requireBusinessOwner(input.userId, booking.business_id);

  await withTransaction(async (client) => {
    await bookingsRepo.updateStatus(booking.id, "CONFIRMED", client);
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BOOKING_CONFIRMED",
        metadata: { bookingId: booking.id },
      },
      client
    );
  });
}

export async function cancelBooking(input: BookingActionInput): Promise<void> {
  const booking = await requireBooking(input.bookingId);
  if (!CANCELLABLE_STATUSES.includes(booking.status)) {
    throw new ServiceError("INVALID", "This booking cannot be cancelled.");
  }

  const isCustomer = booking.customer_id === input.userId;
  const isOwner = await isBusinessOwner(input.userId, booking.business_id);
  if (!isCustomer && !isOwner) {
    throw new ServiceError("FORBIDDEN", "You cannot cancel this booking.");
  }

  await withTransaction(async (client) => {
    await bookingsRepo.updateStatus(booking.id, "CANCELLED", client);
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BOOKING_CANCELLED",
        metadata: {
          bookingId: booking.id,
          cancelledBy: isCustomer ? "customer" : "business",
        },
      },
      client
    );
  });
}

export async function listBookingsForCustomer(input: ListBookingsInput) {
  return bookingsRepo.listByCustomer({
    customerId: input.userId,
    limit: input.limit ?? 20,
    cursor: input.cursor ?? null,
  });
}

export async function listBookingsForBusiness(input: ListBookingsInput) {
  const business = await businessesRepo.findByOwner(input.userId);
  if (!business) return { rows: [], nextCursor: null };
  return bookingsRepo.listByBusiness({
    businessId: business.id,
    limit: input.limit ?? 20,
    cursor: input.cursor ?? null,
  });
}

export async function getBookingForViewer(
  userId: string,
  bookingId: string
): Promise<BookingRow | null> {
  const booking = await bookingsRepo.findById(bookingId);
  if (!booking) return null;
  const isCustomer = booking.customer_id === userId;
  const isOwner = await isBusinessOwner(userId, booking.business_id);
  if (!isCustomer && !isOwner) return null;
  return booking;
}

export type { BookingStatus } from "@/lib/bookings/constants";

export async function completeBooking(input: BookingActionInput): Promise<void> {
  const booking = await requireBooking(input.bookingId);
  if (booking.status !== "CONFIRMED") {
    throw new ServiceError("INVALID", "Only a confirmed booking can be completed.");
  }
  await requireBusinessOwner(input.userId, booking.business_id);

  await withTransaction(async (client) => {
    await bookingsRepo.updateStatus(booking.id, "COMPLETED", client);
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BOOKING_COMPLETED",
        metadata: { bookingId: booking.id },
      },
      client
    );
  });
}

/**
 * Reschedule a booking to a new scheduled_at. The caller must be either the
 * customer or the business owner, and the booking must be in a reschedulable
 * state. If the new slot conflicts with another booking, the service throws.
 *
 * Rescheduling from PENDING or CONFIRMED leaves the status unchanged; the
 * time simply moves. The page badge reads "Rescheduled" only when the
 * status has been explicitly set to RESCHEDULED — the service keeps the
 * existing status so the badge can reflect "the customer moved this."
 */
export async function rescheduleBooking(input: {
  userId: string;
  bookingId: string;
  newScheduledAt: string;
}): Promise<BookingRow> {
  const booking = await requireBooking(input.bookingId);
  if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
    throw new ServiceError(
      "INVALID",
      "Only a pending or confirmed booking can be rescheduled."
    );
  }

  const isCustomer = booking.customer_id === input.userId;
  const isOwner = await isBusinessOwner(input.userId, booking.business_id);
  if (!isCustomer && !isOwner) {
    throw new ServiceError("FORBIDDEN", "You cannot reschedule this booking.");
  }

  if (!booking.business_id) {
    throw new ServiceError(
      "INVALID",
      "This booking has no business to reschedule with."
    );
  }

  const conflict = await bookingsRepo.findConflicts({
    businessId: booking.business_id,
    scheduledAt: input.newScheduledAt,
    excludeBookingId: booking.id,
  });
  if (conflict) {
    throw new ServiceError(
      "INVALID",
      "That time slot is already taken. Please choose another."
    );
  }

  await withTransaction(async (client) => {
    await bookingsRepo.updateScheduledAt(
      booking.id,
      input.newScheduledAt,
      client
    );
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BOOKING_RESCHEDULED",
        metadata: {
          bookingId: booking.id,
          oldScheduledAt: booking.scheduled_at,
          newScheduledAt: input.newScheduledAt,
        },
      },
      client
    );
  });

  const updated = await bookingsRepo.findById(booking.id);
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Booking was not found after reschedule.");
  }
  return updated;
}

export async function markNoShow(input: BookingActionInput): Promise<void> {
  const booking = await requireBooking(input.bookingId);
  if (booking.status !== "CONFIRMED" && booking.status !== "RESCHEDULED") {
    throw new ServiceError(
      "INVALID",
      "Only a confirmed booking can be marked as no-show."
    );
  }
  await requireBusinessOwner(input.userId, booking.business_id);

  await withTransaction(async (client) => {
    await bookingsRepo.updateStatus(booking.id, "NO_SHOW", client);
    await securityEventsRepo.log(
      {
        userId: input.userId,
        eventType: "BOOKING_NO_SHOW",
        metadata: { bookingId: booking.id },
      },
      client
    );
  });
}

/** Exposed so the detail page can compute view props without a second query. */
export { isBusinessOwner };
