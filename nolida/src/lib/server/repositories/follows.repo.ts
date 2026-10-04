import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { UserSummary } from "@/lib/feed/types";

type Db = Pick<PoolClient, "query">;

/**
 * Following, stored as one directional row per relationship.
 *
 * Idempotent for the same reason likes are: `ON CONFLICT DO NOTHING` means
 * tapping Follow twice follows once. The self-follow case is stopped by the
 * service (and again by the `follows_no_self` constraint in the database).
 */
export async function follow(
  input: { followerId: string; followingId: string },
  db?: Db
): Promise<boolean> {
  const text = `INSERT INTO follows (follower_id, following_id)
                VALUES ($1, $2)
                ON CONFLICT (follower_id, following_id) DO NOTHING`;
  const params = [input.followerId, input.followingId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function unfollow(
  input: { followerId: string; followingId: string },
  db?: Db
): Promise<boolean> {
  const text = "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2";
  const params = [input.followerId, input.followingId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

export async function isFollowing(input: {
  followerId: string;
  followingId: string;
}): Promise<boolean> {
  const result = await query(
    "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
    [input.followerId, input.followingId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/** People who follow `userId`. */
export async function listFollowers(userId: string): Promise<UserSummary[]> {
  const result = await query<UserSummary>(
    `SELECT u.id, pr.username, pr.full_name, pr.display_name, pr.avatar_url
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     LEFT JOIN profiles pr ON pr.user_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/** People `userId` follows. */
export async function listFollowing(userId: string): Promise<UserSummary[]> {
  const result = await query<UserSummary>(
    `SELECT u.id, pr.username, pr.full_name, pr.display_name, pr.avatar_url
     FROM follows f
     JOIN users u ON u.id = f.following_id
     LEFT JOIN profiles pr ON pr.user_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * How many people follow `userId`.
 *
 * Counts `follows` rows directly rather than the joined list `listFollowers`
 * returns, because this is a number on a header, not a list of people. The
 * consequence is deliberate and worth knowing: a row pointing at a since-deleted
 * account still counts here but would not appear in the list. Nothing renders
 * both on the same screen today, and `COUNT(*)` on an indexed column is the
 * difference between a sub-millisecond query and one that joins three tables.
 */
export async function countFollowers(userId: string): Promise<number> {
  const result = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1",
    [userId]
  );
  return result.rows[0]?.count ?? 0;
}

/** How many people `userId` follows. See `countFollowers` on counting rows. */
export async function countFollowing(userId: string): Promise<number> {
  const result = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1",
    [userId]
  );
  return result.rows[0]?.count ?? 0;
}