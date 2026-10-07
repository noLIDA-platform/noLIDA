import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  reason: string;
  details: string | null;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  created_at: string;
  updated_at: string;
}

/**
 * Reports (Phase 10 — surfaced in the trust & safety admin phases).
 *
 * A report records what was reported (a message and/or the person behind
 * it), never a verdict: `status` starts OPEN and only an admin moves it.
 * The service refuses to reveal whether a report against the viewer exists.
 */
export async function create(
  input: {
    reporterId: string;
    reportedUserId?: string | null;
    conversationId?: string | null;
    messageId?: string | null;
    reason: string;
    details?: string | null;
  },
  db?: Db
): Promise<ReportRow> {
  const text = `
    INSERT INTO reports (
      reporter_id, reported_user_id, conversation_id, message_id, reason, details
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, reporter_id, reported_user_id, conversation_id, message_id,
              reason, details, status, created_at, updated_at
  `;
  const params = [
    input.reporterId,
    input.reportedUserId ?? null,
    input.conversationId ?? null,
    input.messageId ?? null,
    input.reason,
    input.details ?? null,
  ];
  const result = db
    ? await db.query<ReportRow>(text, params)
    : await query<ReportRow>(text, params);
  const row = result.rows[0];
  if (!row) throw new Error("reports.repo.create returned no row");
  return row;
}

/** Open reports, newest first — the admin queue reads this. */
export async function listOpen(
  input: { limit: number },
  db?: Db
): Promise<ReportRow[]> {
  const text = `SELECT id, reporter_id, reported_user_id, conversation_id,
                       message_id, reason, details, status, created_at, updated_at
                FROM reports
                WHERE status = 'OPEN'
                ORDER BY created_at DESC, id DESC
                LIMIT $1`;
  const result = db
    ? await db.query<ReportRow>(text, [input.limit])
    : await query<ReportRow>(text, [input.limit]);
  return result.rows;
}
