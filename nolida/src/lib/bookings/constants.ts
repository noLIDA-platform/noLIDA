/**
 * Booking rules, shared by the zod boundary, the service and the UI.
 *
 * Client-safe on purpose: a Client Component may not import from
 * `src/lib/server/`, and the booking UI needs these exact bounds to match what
 * the server accepts.
 *
 * The database holds the same bounds as CHECK constraints in
 * `migrations/014_bookings.sql`.
 */

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "NO_SHOW",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  NO_SHOW: "No show",
};

/** What a status MEANS, in a sentence. */
export const BOOKING_STATUS_HINTS: Record<BookingStatus, string> = {
  PENDING: "The business has not confirmed this booking yet.",
  CONFIRMED: "The business has confirmed. The job is scheduled.",
  COMPLETED: "The work is done.",
  CANCELLED: "This booking was cancelled.",
  RESCHEDULED: "The scheduled time has been changed.",
  NO_SHOW: "The scheduled time passed with no arrival.",
};

/** A status the business may act on. */
export const BUSINESS_ACTIONABLE_STATUSES: readonly BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
];

/** A status the customer may cancel. */
export const CUSTOMER_CANCELLABLE_STATUSES: readonly BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
];

/** The currency every booking is quoted in today. */
export const DEFAULT_CURRENCY = "NGN";

/**
 * Money for display.
 *
 * Booking prices are stored in MINOR units (kobo) — `500000` means ₦5,000.00 —
 * matching services and products. Divide by 100 for display.
 */
export function formatMoney(
  amountMinor: number | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  if (amountMinor == null) return "";
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major.toLocaleString("en-NG")} ${currency}`;
  }
}

/** Maximum length for booking notes. */
export const MAX_NOTES_LEN = 1000;