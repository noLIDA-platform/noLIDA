import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { CommentWithAuthor } from "@/lib/feed/types";
import { decodeCursor, encodeCursor } from "./cursor";

type Db = Pick<PoolClient, "query">;

/** Comments join their author the same way posts do — one query, no N+1. */
const SELECT_WITH_AUTHOR = `
  SELECT
    c.id, c.post_id, c.user_id, c.parent_id, c.body, c.like_count,
    c.created_at, c.updated_at,
    jsonb_build_object(
      'id', u.id,
      'username', pr.username,
      'full_name', pr.full_name,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) AS author
  FROM post_comments c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
`;

/**
 * Inserts a comment and returns it already joined to its author.
 *
 * The CTE keeps it to a single statement: insert, then select the new row back
 * out with the author attached. The alternative — insert, then re-read — is a
 * second round-trip for data we already had.
 */
export async function create(
  input: {
    postId: string;
    userId: string;
    parentId?: string | null;
    body: string;
  },
  db?: Db
): Promise<CommentWithAuthor> {
  const text = `
    WITH inserted AS (
      INSERT INTO post_comments (post_id, user_id, parent_id, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id, post_id, user_id, parent_id, body, like_count, created_at, updated_at
    )
    SELECT
      i.id, i.post_id, i.user_id, i.parent_id, i.body, i.like_count,
      i.created_at, i.updated_at,
      jsonb_build_object(
        'id', u.id,
        'username', pr.username,
        'full_name', pr.full_name,
        'display_name', pr.display_name,
        'avatar_url', pr.avatar_url
      ) AS author
    FROM inserted i
    JOIN users u ON u.id = i.user_id
    LEFT JOIN profiles pr ON pr.user_id = u.id`;
  const params = [
    input.postId,
    input.userId,
    input.parentId ?? null,
    input.body,
  ];
  const result = db ? await db.query(text, params) : await query(text, params);
  const row = (result.rows[0] ?? null) as CommentWithAuthor | null;
  if (!row) throw new Error("postComments.repo.create returned no row");
  return row;
}

export async function findWithAuthorById(
  id: string
): Promise<CommentWithAuthor | null> {
  const result = await query<CommentWithAuthor>(
    `${SELECT_WITH_AUTHOR} WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Comments read oldest-first, unlike the feed. A thread is a conversation, and
 * a conversation that grows downwards is the one people expect.
 */
export async function listByPost(input: {
  postId: string;
  limit: number;
  cursor?: string | null;
}): Promise<{ rows: CommentWithAuthor[]; nextCursor: string | null }> {
  const decoded = decodeCursor(input.cursor);
  const result = await query<CommentWithAuthor>(
    `${SELECT_WITH_AUTHOR}
     WHERE c.post_id = $1
       AND ($2::timestamptz IS NULL OR (c.created_at, c.id) > ($2::timestamptz, $3::uuid))
     ORDER BY c.created_at ASC, c.id ASC
     LIMIT $4`,
    [
      input.postId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ]
  );

  const hasMore = result.rows.length > input.limit;
  const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
  const last = rows[rows.length - 1];

  return { rows, nextCursor: hasMore && last ? encodeCursor(last) : null };
}

/** `delete` is reserved, so the repository verb is `remove`. */
export async function remove(id: string, db?: Db): Promise<void> {
  const text = "DELETE FROM post_comments WHERE id = $1";
  if (db) await db.query(text, [id]);
  else await query(text, [id]);
}

export async function incrementLikeCount(
  id: string,
  delta: number,
  db?: Db
): Promise<void> {
  const text = `UPDATE post_comments SET like_count = GREATEST(0, like_count + $2) WHERE id = $1`;
  if (db) await db.query(text, [id, delta]);
  else await query(text, [id, delta]);
}

export async function getLikeCount(id: string): Promise<number> {
  const result = await query<{ like_count: number }>(
    "SELECT like_count FROM post_comments WHERE id = $1",
    [id]
  );
  return result.rows[0]?.like_count ?? 0;
}

/**
 * How many replies hang off this comment.
 *
 * Deleting a parent cascades to its replies, so the post's `comment_count` has
 * to drop by the number of rows that actually disappear — decrementing by one
 * would leave the post claiming comments it no longer has.
 */
export async function countReplies(parentId: string): Promise<number> {
  const result = await query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM post_comments WHERE parent_id = $1",
    [parentId]
  );
  return Number(result.rows[0]?.count ?? "0");
}