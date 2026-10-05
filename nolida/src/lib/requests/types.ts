import { formatMoney } from "./constants";
import type { RequestStatus, RequestUrgency, ResponseStatus } from "./constants";

/**
 * The request and response shapes the UI renders.
 *
 * Declared here rather than in the repositories because no component may import
 * from `src/lib/server/` — that rule exists so a server-only module can never be
 * pulled into a client bundle. The repositories import these and re-export them
 * under their own names, so there is still one definition of each shape and a
 * page hands them straight to a component with no translation step.
 */

/** Who asked. Built in SQL rather than by a per-row round trip. */
export interface RequestAuthorView {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface RequestView {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category_id: string | null;
  category_name: string | null;
  /**
   * MAJOR units (naira), unlike products. See the note in 010_requests.sql.
   */
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  urgency: RequestUrgency;
  location: string | null;
  /**
   * `YYYY-MM-DD`, cast to text in SQL rather than parsed by the driver.
   *
   * node-postgres turns a DATE into a JS Date at LOCAL midnight, which lands on
   * the previous day for anyone west of UTC — so "due 15 March" would render as
   * "due 14 March" in Lagos and be correct in London. A DATE is a calendar day,
   * not an instant, and it should stay a string.
   */
  deadline: string | null;
  /** JSONB, untrusted shape — read it rather than indexing into it. */
  attachments: unknown;
  status: RequestStatus;
  /** Denormalised. See 010_requests.sql. */
  response_count: number;
  accepted_response_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  author: RequestAuthorView;
}

export interface ResponseAuthorView {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ResponseView {
  id: string;
  request_id: string;
  business_id: string | null;
  /** Null once the business is deleted; the response survives that. */
  business_name: string | null;
  business_slug: string | null;
  user_id: string;
  message: string;
  price_estimate: number | null;
  currency: string | null;
  availability_note: string | null;
  attachments: unknown;
  status: ResponseStatus;
  created_at: string;
  updated_at: string;
  author: ResponseAuthorView;
}

/**
 * Attachments are JSONB written by an older migration and by a column default of
 * `'[]'`, so the runtime shape is not guaranteed.
 *
 * Read through this rather than casting: a legacy row that stored something else
 * must not be able to render a broken tile, and `javascript:` here would land in
 * an `src`.
 */
export function readAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.startsWith("https://")
  );
}

/** "3 responses" / "1 response" / "No responses yet". */
export function formatResponseCount(count: number): string {
  if (count === 0) return "No responses yet";
  return count === 1 ? "1 response" : `${count} responses`;
}

/** The single most useful line on a request card. */
export function formatBudgetRange(
  min: number | null,
  max: number | null,
  currency: string
): string | null {
  if (min != null && max != null) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  if (max != null) return `Up to ${formatMoney(max, currency)}`;
  if (min != null) return `From ${formatMoney(min, currency)}`;
  return null;
}