import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { PostRow, PostWithAuthor } from "@/lib/feed/types";
import { decodeCursor, encodeCursor } from "./cursor";
import { VISIBLE_TO_VIEWER } from "./visibility";

type Db = Pick<PoolClient, "query">;

/**
 * Post rows carry a nested `author`, built in SQL rather than by a second
 * round-trip per post. `LEFT JOIN profiles` is deliberate: a user exists the
 * moment they register, but their profile row arrives later, so an inner join
 * would make a brand-new account's posts invisible.
 */
const SELECT_WITH_AUTHOR = `
  SELECT
    p.id, p.user_id, p.business_id, p.type, p.body, p.location, p.category_id,
    p.media, p.metadata, p.visibility, p.like_count, p.comment_count,
    p.share_count, p.created_at, p.updated_at,
    jsonb_build_object(
      'id', u.id,
      'username', pr.username,
      'full_name', pr.full_name,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) AS author
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
`;

const RETURNING = `
  RETURNING id, user_id, business_id, type, body, location, category_id,
            media, metadata, visibility, like_count, comment_count,
            share_count, created_at, updated_at
`;

export async function create(
  input: {
    userId: string;
    body: string;
    type?: string;
    location?: string | null;
    visibility?: string;
    media?: unknown;
  },
  db?: Db
): Promise<PostRow> {
  const text =
    `INSERT INTO posts (user_id, body, type, location, visibility, media)
     VALUES ($1, $2, COALESCE($3, 'GENERAL_POST'), $4, COALESCE($5, 'PUBLIC'), COALESCE($6::jsonb, '[]'::jsonb))
     ${RETURNING}`;
  const params = [
    input.userId,
    input.body,
    input.type ?? null,
    input.location ?? null,
    input.visibility ?? null,
    input.media ? JSON.stringify(input.media) : null,
  ];
  const result = db ? await db.query(text, params) : await query(text, params);
  const row = (result.rows[0] ?? null) as PostRow | null;
  if (!row) throw new Error("posts.repo.create returned no row");
  return row;
}

export async function findWithAuthorById(
  id: string
): Promise<PostWithAuthor | null> {
  const result = await query<PostWithAuthor>(
    `${SELECT_WITH_AUTHOR} WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateBody(
  id: string,
  body: string,
  db?: Db
): Promise<PostRow> {
  const text = `UPDATE posts SET body = $2 WHERE id = $1 ${RETURNING}`;
  const result = db
    ? await db.query(text, [id, body])
    : await query(text, [id, body]);
  const row = (result.rows[0] ?? null) as PostRow | null;
  if (!row) throw new Error("posts.repo.updateBody returned no row");
  return row;
}

/** `delete` is a reserved word, so the repository verb is `remove`. */
export async function remove(id: string): Promise<void> {
  await query("DELETE FROM posts WHERE id = $1", [id]);
}

export async function incrementLikeCount(
  id: string,
  delta: number,
  db?: Db
): Promise<void> {
  const text = `UPDATE posts SET like_count = GREATEST(0, like_count + $2) WHERE id = $1`;
  if (db) await db.query(text, [id, delta]);
  else await query(text, [id, delta]);
}

export async function incrementCommentCount(
  id: string,
  delta: number,
  db?: Db
): Promise<void> {
  const text = `UPDATE posts SET comment_count = GREATEST(0, comment_count + $2) WHERE id = $1`;
  if (db) await db.query(text, [id, delta]);
  else await query(text, [id, delta]);
}

export async function incrementShareCount(
  id: string,
  delta: number,
  db?: Db
): Promise<void> {
  const text = `UPDATE posts SET share_count = GREATEST(0, share_count + $2) WHERE id = $1`;
  if (db) await db.query(text, [id, delta]);
  else await query(text, [id, delta]);
}

/**
 * One post, but only if this viewer is allowed to read it.
 *
 * `null` covers both "no such post" and "not yours to see". The caller turns
 * that into a 404 either way, so a private post's existence is not leaked by a
 * 403 that says "it exists, you just cannot have it".
 */
export async function findForViewer(
  id: string,
  viewerId: string
): Promise<PostWithAuthor | null> {
  const result = await query<PostWithAuthor>(
    `${SELECT_WITH_AUTHOR} WHERE p.id = $2 AND ${VISIBLE_TO_VIEWER}`,
    [viewerId, id]
  );
  return result.rows[0] ?? null;
}

/**
 * The cheap sibling of `findForViewer`: does this viewer get to touch this post?
 *
 * Interactions ask this before writing, because liking, saving or commenting on
 * a post you cannot read is not a 500 — it is a 404, the same as if the post did
 * not exist. Selects one row and nothing else; the feed's author join would be
 * wasted work here.
 */
export async function canView(id: string, viewerId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM posts p WHERE p.id = $2 AND ${VISIBLE_TO_VIEWER}`,
    [viewerId, id]
  );
  return (result.rowCount ?? 0) > 0;
}

export interface PostCounts {
  like_count: number;
  comment_count: number;
  share_count: number;
}

/**
 * The three denormalised counters, re-read after a transaction.
 *
 * The client updates optimistically and then reconciles against these, so the
 * server's number always wins even if two people liked at the same moment.
 */
export async function getCounts(
  id: string,
  db?: Db
): Promise<PostCounts | null> {
  const text =
    "SELECT like_count, comment_count, share_count FROM posts WHERE id = $1";
  const result = db ? await db.query(text, [id]) : await query(text, [id]);
  return (result.rows[0] ?? null) as PostCounts | null;
}

export interface PostPage {
  rows: PostWithAuthor[];
  nextCursor: string | null;
}

/**
 * The shared shape of every feed page: ask for one row more than the page size,
 * and that extra row is the proof there is a next page. Without it the client
 * shows "load more" on the last page and fetches an empty result.
 */
async function toPage(
  text: string,
  params: unknown[],
  limit: number
): Promise<PostPage> {
  const result = await query<PostWithAuthor>(text, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  const last = rows[rows.length - 1];

  return {
    rows,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}

/**
 * The home feed: PUBLIC posts from anyone, FOLLOWERS posts from people the
 * viewer follows, and the viewer's own posts at any visibility.
 *
 * Cursor pagination compares `(created_at, id)` as a row value against the last
 * row of the previous page. Two posts can share a timestamp, so `id` is what
 * makes the order total and stops a page boundary from skipping or repeating a
 * post.
 */
export async function listFeed(input: {
  viewerId: string;
  limit: number;
  cursor?: string | null;
}): Promise<PostPage> {
  const decoded = decodeCursor(input.cursor);
  const text = `${SELECT_WITH_AUTHOR}
    WHERE ${VISIBLE_TO_VIEWER}
      AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::uuid))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $4`;

  return toPage(
    text,
    [
      input.viewerId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ],
    input.limit
  );
}

/** One user's posts, filtered by the same visibility rules as the home feed. */
export async function listByUser(input: {
  userId: string;
  viewerId: string;
  limit: number;
  cursor?: string | null;
}): Promise<PostPage> {
  const decoded = decodeCursor(input.cursor);
  const text = `${SELECT_WITH_AUTHOR}
    WHERE ${VISIBLE_TO_VIEWER}
      AND p.user_id = $4
      AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::uuid))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $5`;

  return toPage(
    text,
    [
      input.viewerId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.userId,
      input.limit + 1,
    ],
    input.limit
  );
}

/**
 * A user's saved posts, ordered by when the *post* was written rather than when
 * it was saved. One cursor shape — `(created_at, id)` of the post — then serves
 * every feed, and the client never has to know which list it is paging.
 *
 * Visibility still applies: saving a post does not outlive the right to read it.
 */
export async function listSavedByUser(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
}): Promise<PostPage> {
  const decoded = decodeCursor(input.cursor);
  const text = `${SELECT_WITH_AUTHOR}
    JOIN saved_posts sp ON sp.post_id = p.id AND sp.user_id = $1
    WHERE ${VISIBLE_TO_VIEWER}
      AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::uuid))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $4`;

  return toPage(
    text,
    [
      input.userId,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ],
    input.limit
  );
}


