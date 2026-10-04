import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface BusinessRequestRow {
  id: string;
  user_id: string;
  business_name: string;
  category: string | null;
  contact_email: string | null;
  description: string | null;
  code_id: string | null;
  status: string;
  created_at: string;
}

const COLUMNS = [
  "id",
  "user_id",
  "business_name",
  "category",
  "contact_email",
  "description",
  "code_id",
  "status",
  "created_at",
].join(", ");

/**
 * Records one submission of the /list-your-business form.
 *
 * Accepts the transaction client so the row commits with the business and the
 * authorization code it produced — a request row pointing at a code that was
 * rolled back would be worse than no row at all.
 */
export async function create(
  input: {
    userId: string;
    businessName: string;
    category?: string | null;
    contactEmail?: string | null;
    description?: string | null;
    codeId?: string | null;
    status?: string;
  },
  db?: Db
): Promise<BusinessRequestRow> {
  const text = `
    INSERT INTO business_requests (
      user_id, business_name, category, contact_email, description, code_id, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${COLUMNS}
  `;
  const params = [
    input.userId,
    input.businessName,
    input.category ?? null,
    input.contactEmail ?? null,
    input.description ?? null,
    input.codeId ?? null,
    input.status ?? "APPROVED_INSTANT",
  ];

  const result = db
    ? await db.query<BusinessRequestRow>(text, params)
    : await query<BusinessRequestRow>(text, params);

  const row = result.rows[0] ?? null;
  if (!row) throw new Error("businessRequests.repo.create returned no row");
  return row;
}

export async function findById(id: string): Promise<BusinessRequestRow | null> {
  const result = await query<BusinessRequestRow>(
    `SELECT ${COLUMNS} FROM business_requests WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/** A user's requests, newest first. Scoped by `user_id` in SQL — never by an id from the client. */
export async function findByUser(userId: string): Promise<BusinessRequestRow[]> {
  const result = await query<BusinessRequestRow>(
    `SELECT ${COLUMNS}
     FROM business_requests
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return result.rows;
}

export async function findLatestByUser(userId: string): Promise<BusinessRequestRow | null> {
  const result = await query<BusinessRequestRow>(
    `SELECT ${COLUMNS}
     FROM business_requests
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}
