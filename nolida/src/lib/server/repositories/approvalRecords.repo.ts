import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface ApprovalRecordRow {
  id: string;
  submission_id: string | null;
  business_id: string;
  admin_user_id: string;
  action: string;
  notes: string | null;
  created_at: string;
}

const COLUMNS = [
  "id",
  "submission_id",
  "business_id",
  "admin_user_id",
  "action",
  "notes",
  "created_at",
].join(", ");

export async function create(
  input: {
    submissionId?: string | null;
    businessId: string;
    adminUserId: string;
    action: string;
    notes?: string | null;
  },
  db?: Db
): Promise<ApprovalRecordRow> {
  const text = `
    INSERT INTO approval_records (submission_id, business_id, admin_user_id, action, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${COLUMNS}
  `;

  const params = [
    input.submissionId ?? null,
    input.businessId,
    input.adminUserId,
    input.action,
    input.notes ?? null,
  ];

  const result = db
    ? await db.query<ApprovalRecordRow>(text, params)
    : await query<ApprovalRecordRow>(text, params);
  const row = result.rows[0] ?? null;
  if (!row) throw new Error("approvalRecords.repo.create returned no row");
  return row;
}
