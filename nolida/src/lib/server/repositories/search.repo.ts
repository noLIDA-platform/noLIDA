import { query } from "@/lib/db/client";
import type { SearchPerson, SearchSort } from "@/types/search";
import { VISIBLE_TO_VIEWER } from "./visibility";

/**
 * Search over posts and people, using PostgreSQL.
 *
 * ## Two mechanisms, two jobs
 *
 * `search_vector` (full-text, GIN) is precise: it knows `photography` and
 * `photographer` are different words, and it ranks. `pg_trgm` trigrams are the
 * *fallback* for what full-text does badly — typos, prefixes, and names — via
 * the `%` operator, which is threshold-based and index-backed rather than a
 * scan.
 *
 * Both are driven off the `'simple'` configuration. See migration 006 for why
 * that is deliberate and not a placeholder.
 *
 * ## Where Meilisearch or Typesense would plug in
 *
 * Right here, and only here. Everything above this file — the service, the
 * routes, the components — talks to these functions and to the shapes in
 * `@/types/search`. Swapping the engine means reimplementing these queries and
 * nothing else: the discriminated union is the contract that survives the
 * change. Do not push ranking or query-building up into the service, or that
 * swap stops being possible.
 *
 * ## Rank is normalised, deliberately
 *
 * `ts_rank()` returns small, unbounded-ish floats whose scale depends on the
 * document. Two kinds of results ranked by two different expressions cannot be
 * compared directly — merging them raw silently stacks one kind above the
 * other. So rank here is a bounded score:
 *
 *   1.0  a full-text match
 *   0-1  how close the trigram fallback got
 *
 * Comparable across kinds, and honest about what it measures.
 */

/** `posts` joined to its author, the same shape the feed returns. */
const POST_COLUMNS = `
  p.id, p.body, p.location, p.created_at, p.like_count, p.comment_count,
  jsonb_build_object(
    'id', u.id,
    'username', pr.username,
    'full_name', pr.full_name,
    'display_name', pr.display_name,
    'avatar_url', pr.avatar_url
  ) AS author
`;

const FROM_POSTS = `
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
`;

/**
 * Full-text OR fuzzy, as a reusable predicate.
 *
 * `websearch_to_tsquery` takes the user's words as typed and handles quotes,
 * `OR`, and `-exclusions` safely, so a search string is never concatenated
 * into SQL.
 *
 * Two details here are load-bearing, and both were measured rather than
 * assumed:
 *
 * 1. `<%` (word similarity), not `%`. `%` scores two strings *as a whole*, so a
 *    seven-letter typo against "New photography studio opening in Lagos next
 *    month" scores 0.18 and never reaches the 0.3 threshold — the long string
 *    is full of good trigrams the query simply does not contain. `<%` asks the
 *    question someone typing "photograpy" actually means: does *any word*
 *    inside this text look like my query? Measured: 0.82.
 *
 * 2. **Operand order: needle first.** `<%` means "the first argument, compared
 *    against any continuous extent of the second". Writing `p.body <% $2`
 *    scores the *entire post* against a short word and returns false even when
 *    a perfect match is sitting inside it — the failure mode that made fuzzy
 *    search look broken. It must be `$2 <% p.body`.
 *
 * The operator is used rather than a bare `word_similarity(...) > x` so that
 * `posts_body_trgm_idx` stays usable: `>%=` is the index-supported commutate
 * of `<%`.
 */
const MATCHES = `(
  p.search_vector @@ websearch_to_tsquery('simple', $2)
  OR $2 <% p.body
)`;

const POST_RANK = `
  CASE
    WHEN p.search_vector @@ websearch_to_tsquery('simple', $2) THEN 1.0
    ELSE GREATEST(word_similarity($2, p.body), 0)
  END
`;

function postOrder(sortBy: SearchSort): string {
  if (sortBy === "recent") return "p.created_at DESC, p.id DESC";
  if (sortBy === "popular") {
    return "p.like_count DESC, p.created_at DESC, p.id DESC";
  }
  // Relevance, ties broken by recency so two equally-good matches still arrive
  // in a sensible order.
  return "rank DESC, p.created_at DESC, p.id DESC";
}

export interface PostSearchRow {
  id: string;
  body: string;
  location: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  /** `jsonb_build_object(...)`, which `pg` hands back as a plain object. */
  author: SearchPerson;
  rank: number;
}

/**
 * Posts matching a query, most relevant first.
 *
 * `viewerId` is not optional and is not a filter: it is what enforces the same
 * `VISIBLE_TO_VIEWER` rule the feed uses. Without it this function would return
 * PRIVATE posts and FOLLOWERS-only posts from strangers — a privacy bug that no
 * amount of correct-looking SQL elsewhere would catch.
 *
 * An empty query is not an error and not an empty result: it means "show me
 * something", so the search predicate is dropped and the list falls back to
 * recency.
 */
export async function searchPosts(input: {
  query: string;
  viewerId: string;
  limit: number;
  offset: number;
  sortBy: SearchSort;
  location?: string | null;
}): Promise<PostSearchRow[]> {
  const trimmed = input.query.trim();
  const hasQuery = trimmed.length > 0;

  const text = `
    SELECT ${POST_COLUMNS}, ${POST_RANK} AS rank
    ${FROM_POSTS}
    WHERE ${VISIBLE_TO_VIEWER}
      AND ($2::text IS NULL OR ${MATCHES})
      AND ($3::text IS NULL OR p.location ILIKE '%' || $3 || '%')
    ORDER BY ${postOrder(input.sortBy)}
    LIMIT $4 OFFSET $5`;

  const result = await query<PostSearchRow>(text, [
    input.viewerId,
    hasQuery ? trimmed : null,
    input.location?.trim() ? input.location.trim() : null,
    input.limit,
    input.offset,
  ]);

  return result.rows;
}

/** Total matches for a query, for `counts.posts`. Same rules, no paging. */
export async function countPosts(input: {
  query: string;
  viewerId: string;
  location?: string | null;
}): Promise<number> {
  const trimmed = input.query.trim();
  const hasQuery = trimmed.length > 0;

  const text = `
    SELECT COUNT(*)::int AS total
    ${FROM_POSTS}
    WHERE ${VISIBLE_TO_VIEWER}
      AND ($2::text IS NULL OR ${MATCHES})
      AND ($3::text IS NULL OR p.location ILIKE '%' || $3 || '%')`;

  const result = await query<{ total: number }>(text, [
    input.viewerId,
    hasQuery ? trimmed : null,
    input.location?.trim() ? input.location.trim() : null,
  ]);

  return result.rows[0]?.total ?? 0;
}
const FROM_USERS = `
  FROM users u
  JOIN profiles pr ON pr.user_id = u.id
`;

/**
 * Full-text OR fuzzy, over the text fields a person is findable by.
 *
 * The trigram arms use `%` on the indexed columns directly, so this stays
 * index-backed. These fields are short — a username or a name — so whole-value
 * similarity is the right comparison here; `<%` would buy nothing over it and
 * cost an index that is not built for it. Case is the full-text index's job,
 * not the trigram's: typing `tolu` against a stored `Tolu` matches through
 * `search_vector`, which lowercases its tokens, so there is no `lower()`
 * wrapper here to defeat `profiles_username_trgm_idx`.
 */
const USER_MATCHES = `(
  pr.search_vector @@ websearch_to_tsquery('simple', $1)
  OR pr.username % $1
  OR pr.full_name % $1
)`;

const USER_RANK = `
  CASE
    WHEN pr.search_vector @@ websearch_to_tsquery('simple', $1) THEN 1.0
    ELSE GREATEST(
      COALESCE(similarity(pr.username, $1), 0),
      COALESCE(similarity(pr.full_name, $1), 0)
    )
  END
`;

export interface UserSearchRow {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_following: boolean;
  rank: number;
}

/**
 * People matching a query.
 *
 * `u.status = 'ACTIVE'` is load-bearing: a suspended account must not turn up
 * in "People to follow". Posts are deliberately *not* filtered by author status
 * — that matches the feed, where an author's older posts stay visible. Being
 * findable is a different question from being suggestible.
 *
 * `is_following` is one correlated `EXISTS` in the same query. It is the
 * difference between a Follow button that works and one that lies.
 */
export async function searchUsers(input: {
  query: string;
  viewerId: string;
  limit: number;
  offset: number;
}): Promise<UserSearchRow[]> {
  const trimmed = input.query.trim();
  const hasQuery = trimmed.length > 0;

  const text = `
    SELECT
      u.id, pr.username, pr.full_name, pr.display_name, pr.bio, pr.avatar_url,
      EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = $2 AND f.following_id = u.id
      ) AS is_following,
      ${USER_RANK} AS rank
    ${FROM_USERS}
    WHERE u.status = 'ACTIVE'
      AND ($1::text IS NULL OR ${USER_MATCHES})
    ORDER BY rank DESC, pr.created_at DESC
    LIMIT $3 OFFSET $4`;

  const result = await query<UserSearchRow>(text, [
    hasQuery ? trimmed : null,
    input.viewerId,
    input.limit,
    input.offset,
  ]);

  return result.rows;
}

export async function countUsers(input: {
  query: string;
}): Promise<number> {
  const trimmed = input.query.trim();
  const hasQuery = trimmed.length > 0;

  const text = `
    SELECT COUNT(*)::int AS total
    ${FROM_USERS}
    WHERE u.status = 'ACTIVE'
      AND ($1::text IS NULL OR ${USER_MATCHES})`;

  const result = await query<{ total: number }>(text, [
    hasQuery ? trimmed : null,
  ]);

  return result.rows[0]?.total ?? 0;
}
/**
 * Discovery: what `/discover` shows before anyone types anything.
 *
 * Same visibility rule as the feed — a "trending" list that could surface
 * someone's private post would be the worst bug in this phase, and trending is
 * exactly where a filter gets forgotten.
 *
 * `rank` stays a 0–1 score (see the note at the top of this file). Here it
 * means "how strong, relative to the best in this set", computed with a window
 * function rather than a magic constant like `/ 10`.
 */

/** Most-liked posts in the last week. */
export async function getTrendingPosts(input: {
  viewerId: string;
  limit?: number;
}): Promise<PostSearchRow[]> {
  const text = `
    SELECT ${POST_COLUMNS},
      COALESCE(
        LEAST(1.0, p.like_count::float / NULLIF(MAX(p.like_count) OVER (), 0)),
        0
      ) AS rank
    ${FROM_POSTS}
    WHERE ${VISIBLE_TO_VIEWER}
      AND p.created_at > NOW() - INTERVAL '7 days'
    ORDER BY p.like_count DESC, p.created_at DESC, p.id DESC
    LIMIT $2`;

  const result = await query<PostSearchRow>(text, [input.viewerId, input.limit ?? 6]);
  return result.rows;
}

/** Newest public posts, regardless of likes. */
export async function getRecentPosts(input: {
  viewerId: string;
  limit?: number;
}): Promise<PostSearchRow[]> {
  const text = `
    SELECT ${POST_COLUMNS},
      COALESCE(
        LEAST(1.0, p.like_count::float / NULLIF(MAX(p.like_count) OVER (), 0)),
        0
      ) AS rank
    ${FROM_POSTS}
    WHERE ${VISIBLE_TO_VIEWER}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $2`;

  const result = await query<PostSearchRow>(text, [input.viewerId, input.limit ?? 10]);
  return result.rows;
}

/**
 * People the viewer does not already follow, most active first.
 *
 * Three deliberate choices:
 *
 * - **They must have posted.** `JOIN LATERAL … ON pc.post_count > 0` both
 *   computes and filters in one step, so a list of empty accounts never
 *   appears. (Aliasing a subquery and filtering on it in `WHERE` is not legal
 *   SQL; the LATERAL join is how you say it once.)
 * - **ACTIVE only**, for the same reason as `searchUsers`.
 * - **Oldest account first** as the tiebreak, so two people with five posts
 *   each are not ordered arbitrarily.
 */
export async function getSuggestedUsers(input: {
  viewerId: string;
  limit?: number;
}): Promise<UserSearchRow[]> {
  const text = `
    SELECT
      u.id, pr.username, pr.full_name, pr.display_name, pr.bio, pr.avatar_url,
      -- False by construction: the WHERE clause below already excludes anyone
      -- the viewer follows. Stated rather than omitted so the card gets the
      -- same shape it gets from search.
      false AS is_following,
      COALESCE(
        LEAST(1.0, pc.post_count::float / NULLIF(MAX(pc.post_count) OVER (), 0)),
        0
      ) AS rank
    ${FROM_USERS}
    JOIN LATERAL (
      SELECT COUNT(*)::int AS post_count FROM posts WHERE user_id = u.id
    ) pc ON pc.post_count > 0
    WHERE u.status = 'ACTIVE'
      AND u.id <> $1
      AND u.id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = $1
      )
    ORDER BY pc.post_count DESC, pr.created_at ASC, u.id ASC
    LIMIT $2`;

  const result = await query<UserSearchRow>(text, [
    input.viewerId,
    input.limit ?? 6,
  ]);
  return result.rows;
}