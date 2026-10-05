import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";
import type {
  RequestView as RequestRow,
  RequestAuthorView as RequestAuthor,
} from "@/lib/requests/types";
import type { RequestStatus, RequestUrgency } from "@/lib/requests/constants";

type Db = Pick<PoolClient, "query">;

// Declared once, in a client-safe module, so the service, the zod boundary and
// the components all speak the same vocabulary. Re-exported here because the
// repository's public surface is the natural place to reach for them.
export type { RequestStatus, RequestUrgency, RequestRow, RequestAuthor };

export interface RequestPage {
  rows: RequestRow[];
  nextCursor: string | null;
}

/**
 * A request with its author and category attached.
 *
 * Both joins are LEFT. A profile row arrives a moment after the user, and a
 * category can be deleted out from under a request — an inner join would make
 * an existing request silently vanish from its own list.
 */
const SELECT_REQUEST = `
  SELECT
    r.id, r.user_id, r.title, r.description, r.category_id,
    c.name AS category_name,
    r.budget_min, r.budget_max, r.currency, r.urgency, r.location,
    r.deadline::text AS deadline,
    r.attachments, r.status, r.response_count, r.accepted_response_id,
    r.closed_at, r.created_at, r.updated_at,
    jsonb_build_object(
      'id', u.id,
      'username', pr.username,
      'full_name', pr.full_name,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) AS author
  FROM requests r
  JOIN users u ON u.id = r.user_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
  LEFT JOIN categories c ON c.id = r.category_id
`;

/**
 * Turn a limit+1 result set into a page plus an honest cursor.
 *
 * The extra row is the trick: fetching `limit + 1` and looking at whether one
 * came back is what makes `nextCursor` mean "there is more" instead of being
 * optimistic.
 */
function toPage(
  rows: RequestRow[],
  limit: number
): RequestPage {
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
    userId: string;
    title: string;
    description: string;
    categoryId?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    currency?: string | null;
    urgency?: RequestUrgency | null;
    location?: string | null;
    deadline?: string | null;
    attachments?: unknown;
  },
  db?: Db
): Promise<RequestRow> {
  const text = `INSERT INTO requests (
      user_id, title, description, category_id, budget_min, budget_max,
      currency, urgency, location, deadline, attachments
    )
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'NGN'), COALESCE($8, 'NORMAL'),
            $9, $10, COALESCE($11, '[]'::jsonb))
    RETURNING id`;
  const params = [
    input.userId,
    input.title,
    input.description,
    input.categoryId ?? null,
    input.budgetMin ?? null,
    input.budgetMax ?? null,
    input.currency ?? null,
    input.urgency ?? null,
    input.location ?? null,
    input.deadline ?? null,
    input.attachments ? JSON.stringify(input.attachments) : null,
  ];
  const result = db ? await db.query(text, params) : await query(text, params);
  const id = (result.rows[0] as { id: string } | undefined)?.id;
  if (!id) throw new Error("requests.repo.create returned no row");
  // Re-read through the joined SELECT so the caller gets exactly the shape a
  // list query would have produced.
  const created = await findById(id, db);
  if (!created) throw new Error("requests.repo.create: row not found after insert");
  return created;
}

export async function findById(
  id: string,
  db?: Db
): Promise<RequestRow | null> {
  const text = `${SELECT_REQUEST} WHERE r.id = $1`;
  const result = db
    ? await db.query<RequestRow>(text, [id])
    : await query<RequestRow>(text, [id]);
  return result.rows[0] ?? null;
}

/** Fields a PATCH may change. The status is NOT here — it has its own rules. */
const UPDATABLE = new Set([
  "title",
  "description",
  "category_id",
  "budget_min",
  "budget_max",
  "currency",
  "urgency",
  "location",
  "deadline",
  "attachments",
]);

/**
 * Edit a request.
 *
 * Keyed by a column allow-list for the same reason `profiles.repo.update` is:
 * a surprise key in the body is dropped rather than written. `status`,
 * `response_count` and `accepted_response_id` are deliberately absent — those
 * are lifecycle, decided by the service inside a transaction, not by a PATCH.
 */
export async function update(
  id: string,
  fields: Partial<RequestRow>
): Promise<RequestRow | null> {
  const entries = Object.entries(fields).filter(
    ([key, value]) =>
      UPDATABLE.has(key) && value !== undefined && key !== "attachments"
  );

  if (entries.length === 0 && fields.attachments === undefined) {
    return findById(id);
  }

  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values: unknown[] = entries.map(([, value]) => value);

  // `attachments` is JSONB and may legitimately be an object rather than a
  // scalar, so it is stringified explicitly instead of riding the allow-list.
  if (fields.attachments !== undefined) {
    values.push(JSON.stringify(fields.attachments));
    sets.push(`attachments = $${values.length}::jsonb`);
  }

  const text = `UPDATE requests SET ${sets.join(", ")} WHERE id = $${values.length + 1}
     RETURNING id`;
  const result = await query(text, [...values, id]);
  if (!result.rows[0]) return null;
  return findById(id);
}

/**
 * The open feed: everything still being answered.
 *
 * `IN_PROGRESS` is included deliberately. A request someone has accepted an
 * offer on is the most useful thing on this page — it proves the marketplace
 * works — and hiding it would leave the feed looking empty while real jobs run.
 */
export async function listOpen(input: {
  limit: number;
  cursor?: string | null;
  categoryId?: string | null;
  location?: string | null;
  urgency?: RequestUrgency | null;
}): Promise<RequestPage> {
  const decoded = decodeCursor(input.cursor);

  const filters = [`r.status IN ('OPEN', 'IN_PROGRESS')`];
  const params: unknown[] = [
    input.categoryId ?? null,
    input.location ?? null,
    input.urgency ?? null,
    decoded?.createdAt ?? null,
    decoded?.id ?? null,
  ];

  if (input.categoryId) filters.push(`r.category_id = $1`);
  if (input.location) filters.push(`r.location ILIKE '%' || $2 || '%'`);
  if (input.urgency) filters.push(`r.urgency = $3`);
  filters.push(
    `($4::timestamptz IS NULL OR (r.created_at, r.id) < ($4::timestamptz, $5::uuid))`
  );

  const text = `${SELECT_REQUEST}
    WHERE ${filters.join(" AND ")}
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT $6`;

  params.push(input.limit + 1);
  const result = await query<RequestRow>(text, params);
  return toPage(result.rows, input.limit);
}

/**
 * Everything one person asked for, any status.
 *
 * Includes CLOSED and CANCELLED on purpose: the list is a history, and a request
 * that vanished the moment it closed would be useless for remembering what you
 * asked for.
 */
export async function listByUser(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
}): Promise<RequestPage> {
  const decoded = decodeCursor(input.cursor);
  const text = `${SELECT_REQUEST}
    WHERE r.user_id = $1
      AND ($2::timestamptz IS NULL OR (r.created_at, r.id) < ($2::timestamptz, $3::uuid))
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT $4`;
  const result = await query<RequestRow>(text, [
    input.userId,
    decoded?.createdAt ?? null,
    decoded?.id ?? null,
    input.limit + 1,
  ]);
  return toPage(result.rows, input.limit);
}

export async function updateStatus(
  id: string,
  status: RequestStatus,
  db?: Db
): Promise<void> {
  const text = "UPDATE requests SET status = $2 WHERE id = $1";
  const params = [id, status];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Move the denormalised response counter.
 *
 * `GREATEST(0, …)` so a withdrawal racing a delete cannot drive it negative —
 * a counter that can go below zero is a counter nobody trusts.
 */
export async function incrementResponseCount(
  id: string,
  delta: number,
  db?: Db
): Promise<void> {
  const text =
    "UPDATE requests SET response_count = GREATEST(0, response_count + $2) WHERE id = $1";
  const params = [id, delta];
  if (db) await db.query(text, params);
  else await query(text, params);
}

export async function setAcceptedResponse(
  id: string,
  responseId: string | null,
  db?: Db
): Promise<void> {
  const text = "UPDATE requests SET accepted_response_id = $2 WHERE id = $1";
  const params = [id, responseId];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/** Close a request, stamping the moment it happened. */
export async function close(
  id: string,
  status: Extract<
    RequestStatus,
    "CLOSED" | "CANCELLED" | "FULFILLED"
  > = "CLOSED",
  db?: Db
): Promise<void> {
  const text = "UPDATE requests SET status = $2, closed_at = NOW() WHERE id = $1";
  const params = [id, status];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Create the feed post that makes a request discoverable.
 *
 * Lives here rather than in the service because this is the only place that
 * knows a request exists — a caller must not be able to attach a feed post to a
 * request that was not created.
 *
 * The body is capped at the `posts_body_length` CHECK (5000). A 200-char title
 * plus a 5000-char description is 5202, so the tail is trimmed: the full text
 * always remains on the request itself, and this post is only a doorway to it.
 */
export async function createFeedPost(
  request: {
    id: string;
    userId: string;
    title: string;
    description: string;
    categoryId: string | null;
  },
  db?: Db
): Promise<string> {
  const POST_BODY_MAX = 5000;
  const body = `${request.title}\n\n${request.description}`.slice(
    0,
    POST_BODY_MAX
  );

  const text = `INSERT INTO posts (user_id, type, body, category_id, metadata, visibility)
    VALUES ($1, 'REQUEST_POST', $2, $3, $4::jsonb, 'PUBLIC')
    RETURNING id`;
  const params = [
    request.userId,
    body,
    request.categoryId,
    JSON.stringify({ requestId: request.id }),
  ];
  const result = db ? await db.query(text, params) : await query(text, params);
  const id = (result.rows[0] as { id: string } | undefined)?.id;
  if (!id) throw new Error("requests.repo.createFeedPost returned no row");
  return id;
}