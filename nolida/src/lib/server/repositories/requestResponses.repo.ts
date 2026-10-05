import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";
import type {
  ResponseView as ResponseRow,
  ResponseAuthorView as ResponseAuthor,
} from "@/lib/requests/types";
import type { ResponseStatus } from "@/lib/requests/constants";

type Db = Pick<PoolClient, "query">;

export type { ResponseStatus, ResponseRow, ResponseAuthor };

export interface ResponsePage {
  rows: ResponseRow[];
  nextCursor: string | null;
}

/**
 * A response with its business and its author attached.
 *
 * Both joins are LEFT. A deleted business must not delete or hide the offer
 * somebody made on it — `business_id` is `ON DELETE SET NULL` for exactly that
 * reason, and an INNER JOIN here would quietly undo that decision at read time.
 */
const SELECT_RESPONSE = `
  SELECT
    rr.id, rr.request_id, rr.business_id,
    b.name AS business_name, b.slug AS business_slug,
    rr.user_id, rr.message, rr.price_estimate, rr.currency,
    rr.availability_note, rr.attachments, rr.status,
    rr.created_at, rr.updated_at,
    jsonb_build_object(
      'id', u.id,
      'username', pr.username,
      'full_name', pr.full_name,
      'avatar_url', pr.avatar_url
    ) AS author
  FROM request_responses rr
  JOIN users u ON u.id = rr.user_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
  LEFT JOIN businesses b ON b.id = rr.business_id
`;

/**
 * Responses for one request, OLDEST FIRST.
 *
 * Ascending, unlike every other list in the app. The customer is reading offers
 * in the order they were made — the first responder asked first and has been
 * waiting longest. Newest-first would make whoever answered immediately look
 * like an afterthought.
 *
 * The shared cursor is reused unchanged; only the comparison flips, because
 * "the next page after this one" is `<` descending and `>` ascending.
 */
export async function listByRequest(input: {
  requestId: string;
  limit: number;
  cursor?: string | null;
}): Promise<ResponsePage> {
  const decoded = decodeCursor(input.cursor);
  const result = await query<ResponseRow>(
    `${SELECT_RESPONSE}
     WHERE rr.request_id = $1
       AND ($2::timestamptz IS NULL OR (rr.created_at, rr.id) > ($2::timestamptz, $3::uuid))
     ORDER BY rr.created_at ASC, rr.id ASC
     LIMIT $4`,
    [
      input.requestId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ]
  );

  const hasMore = result.rows.length > input.limit;
  const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}

export async function findById(
  id: string,
  db?: Db
): Promise<ResponseRow | null> {
  const text = `${SELECT_RESPONSE} WHERE rr.id = $1`;
  const result = db
    ? await db.query<ResponseRow>(text, [id])
    : await query<ResponseRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function create(
  input: {
    requestId: string;
    businessId: string;
    userId: string;
    message: string;
    priceEstimate?: number | null;
    currency?: string | null;
    availabilityNote?: string | null;
    attachments?: unknown;
  },
  db?: Db
): Promise<ResponseRow> {
  const text = `INSERT INTO request_responses (
      request_id, business_id, user_id, message, price_estimate, currency,
      availability_note, attachments
    )
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'NGN'), $7, COALESCE($8, '[]'::jsonb))
    RETURNING id`;
  const params = [
    input.requestId,
    input.businessId,
    input.userId,
    input.message,
    input.priceEstimate ?? null,
    input.currency ?? null,
    input.availabilityNote ?? null,
    input.attachments ? JSON.stringify(input.attachments) : null,
  ];
  const result = db ? await db.query(text, params) : await query(text, params);
  const id = (result.rows[0] as { id: string } | undefined)?.id;
  if (!id) throw new Error("requestResponses.repo.create returned no row");
  const created = await findById(id, db);
  if (!created) {
    throw new Error("requestResponses.repo.create: row not found after insert");
  }
  return created;
}

/**
 * Has this business already answered this request?
 *
 * The unique constraint is the real guarantee — two taps cannot produce two rows
 * however fast they arrive. This exists so the caller can return a sentence
 * instead of an opaque unique-violation, which is what a duplicate would
 * otherwise surface as.
 */
export async function hasResponded(input: {
  requestId: string;
  businessId: string;
}): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM request_responses
     WHERE request_id = $1 AND business_id = $2 LIMIT 1`,
    [input.requestId, input.businessId]
  );
  return result.rows.length > 0;
}

export async function updateStatus(
  id: string,
  status: ResponseStatus,
  db?: Db
): Promise<void> {
  const text = "UPDATE request_responses SET status = $2 WHERE id = $1";
  const params = [id, status];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Decline every other offer on a request, in one statement.
 *
 * One UPDATE rather than a loop: accepting an offer is a single moment, and every
 * other offer is DECLINED because of it. A loop would leave the request
 * half-accepted if it failed halfway.
 *
 * ACCEPTED is included as well as PENDING, and that is load-bearing. Accepting is
 * allowed from IN_PROGRESS as well as OPEN, so a customer can change their mind
 * and pick a different business — and without demoting the previous winner here,
 * the request would end up with TWO responses marked ACCEPTED and no way to tell
 * which one the customer actually chose.
 */
export async function declineOthers(
  requestId: string,
  exceptResponseId: string,
  db?: Db
): Promise<void> {
  const text = `UPDATE request_responses
     SET status = 'DECLINED'
     WHERE request_id = $1
       AND id <> $2
       AND status IN ('PENDING', 'ACCEPTED')`;
  const params = [requestId, exceptResponseId];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Live response count for a request, ignoring withdrawn offers.
 *
 * WITHDRAWN is excluded deliberately: someone retracting an offer should take it
 * off the customer's list, not leave a tombstone saying somebody is almost
 * certainly coming.
 */
export async function countByRequest(requestId: string): Promise<number> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM request_responses
     WHERE request_id = $1 AND status <> 'WITHDRAWN'`,
    [requestId]
  );
  return result.rows[0]?.count ?? 0;
}