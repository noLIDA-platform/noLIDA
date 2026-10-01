import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface AuthorizationCodeRow {
  id: string;
  code: string;
  status: string;
  purpose: string;
  max_uses: number;
  uses_count: number;
  notes: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuthorizationCodeUsageRow {
  id: string;
  code_id: string;
  used_by_user_id: string;
  used_at: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
}

const COLUMNS = [
  "id",
  "code",
  "status",
  "purpose",
  "max_uses",
  "uses_count",
  "notes",
  "expires_at",
  "created_by",
  "created_at",
  "updated_at",
].join(", ");

export async function create(
  input: {
    code: string;
    purpose?: string;
    maxUses: number;
    notes?: string | null;
    expiresAt?: Date | string | null;
    createdBy: string;
  },
  db?: Db
): Promise<AuthorizationCodeRow> {
  const text = `
    INSERT INTO authorization_codes (code, purpose, max_uses, notes, expires_at, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ${COLUMNS}
  `;

  const result = db
    ? await db.query<AuthorizationCodeRow>(text, [
        input.code,
        input.purpose ?? "BUSINESS_LISTING",
        input.maxUses,
        input.notes ?? null,
        input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
        input.createdBy,
      ])
    : await query<AuthorizationCodeRow>(text, [
        input.code,
        input.purpose ?? "BUSINESS_LISTING",
        input.maxUses,
        input.notes ?? null,
        input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
        input.createdBy,
      ]);

  const row = result.rows[0] ?? null;
  if (!row) throw new Error("authorizationCodes.repo.create returned no row");
  return row;
}

export async function findById(
  id: string,
  db?: Db
): Promise<AuthorizationCodeRow | null> {
  const text = `SELECT ${COLUMNS} FROM authorization_codes WHERE id = $1`;
  const result = db
    ? await db.query<AuthorizationCodeRow>(text, [id])
    : await query<AuthorizationCodeRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function findByCode(
  code: string,
  db?: Db
): Promise<AuthorizationCodeRow | null> {
  const text = `SELECT ${COLUMNS} FROM authorization_codes WHERE code = $1`;
  const result = db
    ? await db.query<AuthorizationCodeRow>(text, [code])
    : await query<AuthorizationCodeRow>(text, [code]);
  return result.rows[0] ?? null;
}

export async function incrementUses(
  id: string,
  db?: Db
): Promise<AuthorizationCodeRow | null> {
  const text = `
    UPDATE authorization_codes
    SET uses_count = uses_count + 1,
        updated_at = NOW()
    WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = db
    ? await db.query<AuthorizationCodeRow>(text, [id])
    : await query<AuthorizationCodeRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: string,
  db?: Db
): Promise<AuthorizationCodeRow | null> {
  const text = `
    UPDATE authorization_codes
    SET status = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = db
    ? await db.query<AuthorizationCodeRow>(text, [id, status])
    : await query<AuthorizationCodeRow>(text, [id, status]);
  return result.rows[0] ?? null;
}

export async function listAll(input: {
  status?: string;
  limit?: number;
  cursor?: string;
}): Promise<AuthorizationCodeRow[]> {
  const limit = Math.max(1, Math.min(100, input.limit ?? 25));
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (input.status) {
    params.push(input.status);
    clauses.push(`status = $${params.length}`);
  }

  if (input.cursor) {
    params.push(input.cursor);
    clauses.push(`created_at < $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(limit);

  const result = await query<AuthorizationCodeRow>(
    `SELECT ${COLUMNS}
     FROM authorization_codes
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows;
}

export async function logUsage(input: {
  codeId: string;
  userId: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO authorization_code_usage (code_id, used_by_user_id, ip_address, metadata)
     VALUES ($1, $2, $3, $4)`,
    [
      input.codeId,
      input.userId,
      input.ipAddress ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}

export async function findUsageByCode(
  codeId: string
): Promise<AuthorizationCodeUsageRow[]> {
  const result = await query<AuthorizationCodeUsageRow>(
    `SELECT *
     FROM authorization_code_usage
     WHERE code_id = $1
     ORDER BY used_at DESC, id DESC`,
    [codeId]
  );
  return result.rows;
}
