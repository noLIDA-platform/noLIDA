import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";
import type { BookingView as BookingRow } from "@/lib/bookings/types";
import type { BookingStatus } from "@/lib/bookings/constants";

type Db = Pick<PoolClient, "query">;

export type { BookingStatus, BookingRow };

export interface BookingPage {
  rows: BookingRow[];
  nextCursor: string | null;
}

const SELECT_BOOKING = `
  SELECT
    b.id, b.request_id, b.response_id, b.customer_id, b.business_id,
    bs.name AS business_name, bs.slug AS business_slug,
    b.price_minor, b.currency, b.scheduled_at, b.notes, b.status,
    b.created_at, b.updated_at
  FROM bookings b
  LEFT JOIN businesses bs ON bs.id = b.business_id
`;

/**
 * Turn a limit+1 result set into a page plus an honest cursor.
 */
function toPage(rows: BookingRow[], limit: number): BookingPage {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    rows: page,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}

export async function create(
  input: {
    requestId: string;
    responseId: string;
    customerId: string;
    businessId: string;
    priceMinor: number;
    currency?: string;
    scheduledAt?: string | null;
    notes?: string | null;
  },
  db?: Db
): Promise<BookingRow> {
  const text = `INSERT INTO bookings (
      request_id, response_id, customer_id, business_id, price_minor, currency,
      scheduled_at, notes
    )
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'NGN'), $7, $8)
    RETURNING id`;
  const params = [
    input.requestId,
    input.responseId,
    input.customerId,
    input.businessId,
    input.priceMinor,
    input.currency ?? null,
    input.scheduledAt ?? null,
    input.notes ?? null,
  ];
  const result = db ? await db.query(text, params) : await query(text, params);
  const id = (result.rows[0] as { id: string } | undefined)?.id;
  if (!id) throw new Error("bookings.repo.create returned no row");
  const created = await findById(id, db);
  if (!created) {
    throw new Error("bookings.repo.create: row not found after insert");
  }
  return created;
}

export async function findById(
  id: string,
  db?: Db
): Promise<BookingRow | null> {
  const text = `${SELECT_BOOKING} WHERE b.id = $1`;
  const result = db
    ? await db.query<BookingRow>(text, [id])
    : await query<BookingRow>(text, [id]);
  return result.rows[0] ?? null;
}

/**
 * Bookings where the session user is the customer, newest first.
 */
export async function listByCustomer(input: {
  customerId: string;
  limit: number;
  cursor?: string | null;
}): Promise<BookingPage> {
  const decoded = decodeCursor(input.cursor);
  const result = await query<BookingRow>(
    `${SELECT_BOOKING}
     WHERE b.customer_id = $1
       AND ($2::timestamptz IS NULL OR (b.created_at, b.id) < ($2::timestamptz, $3::uuid))
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT $4`,
    [
      input.customerId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ]
  );
  return toPage(result.rows, input.limit);
}

/**
 * Bookings for a business the session user owns, newest first.
 */
export async function listByBusiness(input: {
  businessId: string;
  limit: number;
  cursor?: string | null;
}): Promise<BookingPage> {
  const decoded = decodeCursor(input.cursor);
  const result = await query<BookingRow>(
    `${SELECT_BOOKING}
     WHERE b.business_id = $1
       AND ($2::timestamptz IS NULL OR (b.created_at, b.id) < ($2::timestamptz, $3::uuid))
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT $4`,
    [
      input.businessId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ]
  );
  return toPage(result.rows, input.limit);
}

/**
 * Update a booking's status. Only the documented transitions are allowed:
 * PENDING -> CONFIRMED / CANCELLED; CONFIRMED -> COMPLETED / CANCELLED.
 * Called inside a transaction by the service.
 */
export async function updateStatus(
  id: string,
  status: BookingStatus,
  db?: Db
): Promise<void> {
  const text = "UPDATE bookings SET status = $2 WHERE id = $1";
  const params = [id, status];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Has this response already been booked? The unique constraint is the real
 * guarantee; this exists so the caller can return a sentence instead of an
 * opaque unique-violation.
 */
export async function hasBookingForResponse(input: {
  responseId: string;
}): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM bookings WHERE response_id = $1 LIMIT 1`,
    [input.responseId]
  );
  return result.rows.length > 0;
}

/**
 * Update the scheduled-at timestamp for a booking. Called inside a
 * transaction by the service.
 */
export async function updateScheduledAt(
  id: string,
  scheduledAt: string | null,
  db?: Db
): Promise<void> {
  const text = "UPDATE bookings SET scheduled_at = $2 WHERE id = $1";
  const params = [id, scheduledAt];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Update the notes for a booking.
 */
export async function updateNotes(
  id: string,
  notes: string | null,
  db?: Db
): Promise<void> {
  const text = "UPDATE bookings SET notes = $2 WHERE id = $1";
  const params = [id, notes];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Count bookings for a business (for dashboard stats).
 */
export async function countByBusiness(businessId: string): Promise<number> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::INTEGER AS count FROM bookings WHERE business_id = $1`,
    [businessId]
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * Count bookings placed by a customer (for dashboard stats).
 */
export async function countByCustomer(customerUserId: string): Promise<number> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::INTEGER AS count FROM bookings WHERE customer_id = $1`,
    [customerUserId]
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * Is there another non-terminal booking for the same business at this time?
 * Used by the reschedule service to prevent double-booking a slot.
 */
export async function findConflicts(input: {
  businessId: string;
  scheduledAt: string;
  excludeBookingId?: string | null;
}): Promise<boolean> {
  if (input.excludeBookingId) {
    const text = `
      SELECT 1 FROM bookings
      WHERE business_id = $1
        AND scheduled_at = $2::timestamptz
        AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')
        AND id != $3
      LIMIT 1
    `;
    const result = await query(text, [
      input.businessId,
      input.scheduledAt,
      input.excludeBookingId,
    ]);
    return result.rows.length > 0;
  }
  const text = `
    SELECT 1 FROM bookings
    WHERE business_id = $1
      AND scheduled_at = $2::timestamptz
      AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULED')
    LIMIT 1
  `;
  const result = await query(text, [input.businessId, input.scheduledAt]);
  return result.rows.length > 0;
}