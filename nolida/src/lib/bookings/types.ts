import { formatMoney } from "./constants";
import type { BookingStatus } from "./constants";

/**
 * The booking shape the UI renders.
 *
 * Declared here rather than in the repositories because no component may import
 * from `src/lib/server/` — that rule exists so a server-only module can never be
 * pulled into a client bundle. The repository imports this and re-exports it
 * under its own name, so there is still one definition of each shape and a page
 * hands it straight to a component with no translation step.
 */

export interface BookingView {
  id: string;
  request_id: string;
  response_id: string;
  customer_id: string;
  business_id: string | null;
  /** Null once the business is deleted; the booking survives that. */
  business_name: string | null;
  business_slug: string | null;
  /** MINOR units (kobo). See 014_bookings.sql. */
  price_minor: number;
  currency: string;
  scheduled_at: string | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

/** "₦5,000" from minor-unit kobo. */
export function formatBookingPrice(
  priceMinor: number,
  currency: string
): string {
  return formatMoney(priceMinor, currency);
}