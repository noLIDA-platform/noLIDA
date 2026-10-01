import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

/**
 * Comment likes, the same idempotent shape as post likes. A like is a row, not
 * a flag — `ON CONFLICT DO NOTHING` is what makes a second tap a no-op.
 */
export async function add(
  input: { commentId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = `INSERT INTO comment_likes (comment_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (comment_id, user_id) DO NOTHING`;
  const params = [input.commentId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function remove(
  input: { commentId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2";
  const params = [input.commentId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function hasLiked(input: {
  commentId: string;
  userId: string;
}): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
    [input.commentId, input.userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}