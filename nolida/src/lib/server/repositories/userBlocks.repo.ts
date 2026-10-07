import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface UserBlockRow {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * Blocks (Phase 10).
 *
 * A block is directional and stored once per direction: blocking someone
 * does not delete either side's history, it makes new messages impossible
 * in both directions (the service checks BOTH directions) and hides the
 * conversation behind a status the UI can explain.
 */
export async function create(
  input: { blockerId: string; blockedId: string },
  db?: Db
): Promise<UserBlockRow | null> {
  const text = `
    INSERT INTO user_blocks (blocker_id, blocked_id)
    VALUES ($1, $2)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    RETURNING blocker_id, blocked_id, created_at
  `;
  const params = [input.blockerId, input.blockedId];
  const result = db
    ? await db.query<UserBlockRow>(text, params)
    : await query<UserBlockRow>(text, params);
  return result.rows[0] ?? null;
}

/** Idempotent: unblocking someone who was never blocked is a no-op. */
export async function remove(
  input: { blockerId: string; blockedId: string },
  db?: Db
): Promise<boolean> {
  const text = `DELETE FROM user_blocks
                WHERE blocker_id = $1 AND blocked_id = $2`;
  const params = [input.blockerId, input.blockedId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

/** Both directions at once — the service needs to know who blocked whom. */
export async function getBetween(
  userA: string,
  userB: string,
  db?: Db
): Promise<{ blocked_by_me: boolean; blocked_by_other: boolean }> {
  const text = `
    SELECT
      EXISTS(
        SELECT 1 FROM user_blocks
        WHERE blocker_id = $1 AND blocked_id = $2
      ) AS blocked_by_me,
      EXISTS(
        SELECT 1 FROM user_blocks
        WHERE blocker_id = $2 AND blocked_id = $1
      ) AS blocked_by_other
  `;
  const params = [userA, userB];
  const result = db
    ? await db.query<{ blocked_by_me: boolean; blocked_by_other: boolean }>(
        text,
        params
      )
    : await query<{ blocked_by_me: boolean; blocked_by_other: boolean }>(
        text,
        params
      );
  return (
    result.rows[0] ?? { blocked_by_me: false, blocked_by_other: false }
  );
}
