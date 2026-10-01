import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

/** Idempotent save, mirroring `postLikes.repo.add`. */
export async function add(
  input: { postId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = `INSERT INTO saved_posts (post_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (post_id, user_id) DO NOTHING`;
  const params = [input.postId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function remove(
  input: { postId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = "DELETE FROM saved_posts WHERE post_id = $1 AND user_id = $2";
  const params = [input.postId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function hasSaved(input: {
  postId: string;
  userId: string;
}): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM saved_posts WHERE post_id = $1 AND user_id = $2",
    [input.postId, input.userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/** The batched `saved` lookup the feed uses to avoid one query per post. */
export async function listPostIds(
  userId: string,
  postIds: string[]
): Promise<string[]> {
  if (postIds.length === 0) return [];
  const result = await query<{ post_id: string }>(
    "SELECT post_id FROM saved_posts WHERE user_id = $1 AND post_id = ANY($2::uuid[])",
    [userId, postIds]
  );
  return result.rows.map((row) => row.post_id);
}