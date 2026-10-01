import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { UserSummary } from "@/lib/feed/types";

type Db = Pick<PoolClient, "query">;

/**
 * Inserts a like and reports whether it was new.
 *
 * `ON CONFLICT DO NOTHING` is what makes liking idempotent: the caller only
 * bumps `posts.like_count` when this returns `true`, so a double-tap cannot
 * count twice. The UNIQUE (post_id, user_id) constraint is the arbiter, not a
 * checked-then-inserted race.
 */
export async function add(
  input: { postId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = `INSERT INTO post_likes (post_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (post_id, user_id) DO NOTHING`;
  const params = [input.postId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

/** Removes a like and reports whether a row actually went away. */
export async function remove(
  input: { postId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2";
  const params = [input.postId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function hasLiked(input: {
  postId: string;
  userId: string;
}): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2",
    [input.postId, input.userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * One query for a whole page of posts. The alternative — asking per post —
 * is the N+1 pattern the feed is required to avoid.
 */
export async function listPostIds(
  userId: string,
  postIds: string[]
): Promise<string[]> {
  if (postIds.length === 0) return [];
  const result = await query<{ post_id: string }>(
    "SELECT post_id FROM post_likes WHERE user_id = $1 AND post_id = ANY($2::uuid[])",
    [userId, postIds]
  );
  return result.rows.map((row) => row.post_id);
}

export async function listUsersWhoLiked(postId: string): Promise<UserSummary[]> {
  const result = await query<UserSummary>(
    `SELECT u.id, pr.username, pr.full_name, pr.display_name, pr.avatar_url
     FROM post_likes pl
     JOIN users u ON u.id = pl.user_id
     LEFT JOIN profiles pr ON pr.user_id = u.id
     WHERE pl.post_id = $1
     ORDER BY pl.created_at DESC`,
    [postId]
  );
  return result.rows;
}