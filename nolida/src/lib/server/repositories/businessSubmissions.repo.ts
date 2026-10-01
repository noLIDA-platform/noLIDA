import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface BusinessSubmissionRow {
  id: string;
  business_id: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  submitted_at: string;
}

const COLUMNS = [
  "id",
  "business_id",
  "user_id",
  "payload",
  "status",
  "submitted_at",
].join(", ");

export async function create(
  input: {
    businessId: string;
    userId: string | null;
    payload: Record<string, unknown>;
  },
  db?: Db
): Promise<BusinessSubmissionRow> {
  const text = `
    INSERT INTO business_submissions (business_id, user_id, payload)
    VALUES ($1, $2, $3)
    RETURNING ${COLUMNS}
  `;
  const params = [input.businessId, input.userId ?? null, JSON.stringify(input.payload)];
  const result = db
    ? await db.query<BusinessSubmissionRow>(text, params)
    : await query<BusinessSubmissionRow>(text, params);
  const row = result.rows[0] ?? null;
  if (!row) throw new Error("businessSubmissions.repo.create returned no row");
  return row;
}

export async function findById(id: string, db?: Db): Promise<BusinessSubmissionRow | null> {
  const text = `SELECT ${COLUMNS} FROM business_submissions WHERE id = $1`;
  const result = db
    ? await db.query<BusinessSubmissionRow>(text, [id])
    : await query<BusinessSubmissionRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function findLatestForBusiness(
  businessId: string,
  db?: Db
): Promise<BusinessSubmissionRow | null> {
  const text = `
    SELECT ${COLUMNS}
    FROM business_submissions
    WHERE business_id = $1
    ORDER BY submitted_at DESC, id DESC
    LIMIT 1
  `;

  const result = db
    ? await db.query<BusinessSubmissionRow>(text, [businessId])
    : await query<BusinessSubmissionRow>(text, [businessId]);
  return result.rows[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: string,
  db?: Db
): Promise<BusinessSubmissionRow | null> {
  const text = `
    UPDATE business_submissions
    SET status = $2
    WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = db
    ? await db.query<BusinessSubmissionRow>(text, [id, status])
    : await query<BusinessSubmissionRow>(text, [id, status]);
  return result.rows[0] ?? null;
}

export async function listPending(input: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<BusinessSubmissionRow[]> {
  const limit = Math.max(1, Math.min(100, input.limit ?? 25));
  const offset = Math.max(0, input.offset ?? 0);
  const status = input.status ?? "PENDING_REVIEW";

  const result = await query<BusinessSubmissionRow>(
    `SELECT ${COLUMNS}
     FROM business_submissions
     WHERE status = $1
     ORDER BY submitted_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  return result.rows;
}
