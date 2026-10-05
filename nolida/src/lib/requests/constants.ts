/**
 * Request rules, shared by the zod boundary, the service and the UI.
 *
 * Client-safe on purpose: a Client Component may not import from
 * `src/lib/server/`, and the composer needs these exact bounds to show a counter
 * that matches what the server will accept. Three copies of `200` would drift,
 * and the drift shows up as a field that looks fine and then refuses to save.
 *
 * The database holds the same bounds as CHECK constraints. Three layers, because
 * "a title is 5 to 200 characters" should survive a new caller that checks none
 * of them.
 */

export const MIN_TITLE_LEN = 5;
export const MAX_TITLE_LEN = 200;

export const MIN_DESCRIPTION_LEN = 10;
export const MAX_DESCRIPTION_LEN = 5000;

export const MIN_MESSAGE_LEN = 5;
export const MAX_MESSAGE_LEN = 2000;

export const MAX_LOCATION_LEN = 200;
export const MAX_NOTE_LEN = 200;

export const MAX_ATTACHMENTS = 3;

/** Ceilings are not enforced in the database — see docs/REQUESTS.md. */
export const MAX_BUDGET = 2_147_483_647;

export const REQUEST_URGENCIES = ["URGENT", "NORMAL", "FLEXIBLE"] as const;
export type RequestUrgency = (typeof REQUEST_URGENCIES)[number];

export const REQUEST_URGENCY_LABELS: Record<RequestUrgency, string> = {
  URGENT: "Urgent",
  NORMAL: "Normal",
  FLEXIBLE: "Flexible",
};

/** One line telling the customer what "urgent" actually means to a responder. */
export const REQUEST_URGENCY_HINTS: Record<RequestUrgency, string> = {
  URGENT: "Needed as soon as possible — usually today or tomorrow.",
  NORMAL: "Needed within the next few days.",
  FLEXIBLE: "No fixed date. Quote the best window you can.",
};

export const REQUEST_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "FULFILLED",
  "CLOSED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  FULFILLED: "Fulfilled",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

/**
 * What a status MEANS, in a sentence.
 *
 * A label on its own invites a question. "In progress" could mean someone is
 * travelling to you or that an offer was accepted an hour ago, and the second
 * reading is the one that decides whether someone should send another message.
 */
export const REQUEST_STATUS_HINTS: Record<RequestStatus, string> = {
  OPEN: "Waiting for businesses to send you offers.",
  IN_PROGRESS: "An offer was accepted and this is now with that business.",
  FULFILLED: "The work is done.",
  CLOSED: "This request is no longer accepting offers.",
  CANCELLED: "You cancelled this request.",
};

/** A status that still accepts new offers. */
export const ACCEPTING_STATUSES: readonly RequestStatus[] = [
  "OPEN",
  "IN_PROGRESS",
];

export const RESPONSE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const RESPONSE_STATUS_LABELS: Record<ResponseStatus, string> = {
  PENDING: "Awaiting your decision",
  ACCEPTED: "Accepted",
  DECLINED: "Not chosen",
  WITHDRAWN: "Withdrawn",
};

/** The currency every request is quoted in today. */
export const DEFAULT_CURRENCY = "NGN";

/**
 * Money for display.
 *
 * Budgets are stored in MAJOR units (naira) — `50000` means ₦50,000 — unlike
 * products and services, which use minor units. `Intl.NumberFormat` is given the
 * value untouched and the currency separately; multiplying by 100 here "for
 * consistency with the catalog" would display every budget 100× too large.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  if (amount == null) return "";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown currency code must not blank the price.
    return `${amount.toLocaleString("en-NG")} ${currency}`;
  }
}

/** "by 15 March", from a `YYYY-MM-DD` deadline. */
export function formatDeadline(deadline: string): string {
  const parsed = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}