import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

/**
 * Records a share and reports whether it was new.
 *
 * The UNIQUE (post_id, user_id, channel) constraint makes this idempotent, so
 * one person copying the same link twice moves `share_count` once. `channel`
 * is NOT NULL in the schema for exactly this reason — a null would be treated
 * as distinct and slip past the constraint.
 */
export async function create(
  input: { postId: string; userId: string; channel?: string },
  db?: Db
): Promise<boolean> {
  const text = `INSERT INTO post_shares (post_id, user_id, channel)
                VALUES ($1, $2, COALESCE($3, 'COPY_LINK'))
                ON CONFLICT (post_id, user_id, channel) DO NOTHING`;
  const params = [input.postId, input.userId, input.channel ?? null];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}