import * as searchRepo from "@/lib/server/repositories/search.repo";
import type {
  DiscoveryData,
  SearchPost,
  SearchResponse,
  SearchResult,
  SearchResultType,
  SearchSort,
  SearchUser,
} from "@/types/search";

/**
 * Search and discovery.
 *
 * The seam between "how results are found" and "what a result is". The
 * repository is the only thing that knows about `tsvector`, trigrams, or rank
 * arithmetic; the routes and components only ever see the shapes in
 * `@/types/search`.
 *
 * That boundary is the whole point. When noLIDA outgrows Postgres full-text
 * search, this file and `search.repo.ts` are what get rewritten for
 * Meilisearch or Typesense — the API contract, the discriminated union and
 * every component survive untouched. Keep ranking logic on the repository side
 * of this line and that swap stays cheap.
 */

export interface SearchParams {
  /**
   * Who is searching. Required, and not a filter: it is what enforces post
   * visibility. A search that omitted it would happily return private posts.
   */
  viewerId: string;
  query: string;
  /**
   * `"business"` is accepted and always returns nothing until Phase 8. It is
   * in the type on purpose: the day businesses become searchable this is a
   * data change, not a signature change, and nothing in between has to be
   * rewritten to make room for it.
   *
   * The route's schema still only accepts `all | post | user`, so the stub is
   * unreachable from outside today — which is what keeps it honest.
   */
  type?: "all" | SearchResultType;
  location?: string | null;
  sortBy?: SearchSort;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Offsets are bounded for the usual reason: `LIMIT 20 OFFSET 1000000` makes
 * the database walk a million rows to throw them away.
 */
const MAX_OFFSET = 500;

function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function clampOffset(offset: number | undefined): number {
  if (!offset || Number.isNaN(offset)) return 0;
  return Math.min(Math.max(Math.trunc(offset), 0), MAX_OFFSET);
}

/** Original casing is preserved for the search itself; only trimmed. */
function normaliseQuery(query: string): string {
  return typeof query === "string" ? query.trim().slice(0, 200) : "";
}

function toPost(row: searchRepo.PostSearchRow): SearchPost {
  return {
    type: "post",
    id: row.id,
    body: row.body,
    location: row.location,
    created_at: row.created_at,
    like_count: row.like_count,
    comment_count: row.comment_count,
    author: row.author,
    rank: Number(row.rank) || 0,
  };
}

function toUser(row: searchRepo.UserSearchRow): SearchUser {
  return {
    type: "user",
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    // `pg` hands back a real boolean here; `Boolean` guards a driver that
    // might hand back a string instead.
    is_following: Boolean(row.is_following),
    rank: Number(row.rank) || 0,
  };
}

function emptyCounts(): SearchResponse["counts"] {
  return { posts: 0, users: 0, businesses: 0 };
}

/**
 * Searches posts and/or people.
 *
 * `type: "all"` merges the two kinds by `rank`. Because rank is normalised to
 * 0–1 on both sides (see `search.repo.ts`), the merge is meaningful — an
 * unnormalised merge would just stack whichever kind happened to return bigger
 * numbers. Ties keep each side's own ordering, because `Array.sort` is stable.
 *
 * Offsets apply to the *merged* list, so each kind is fetched with
 * `limit + offset` rows and the slice is taken after the merge. Fetching only
 * `limit` per side would make page two wrong.
 */
export async function search(params: SearchParams): Promise<SearchResponse> {
  const query = normaliseQuery(params.query);
  const limit = clampLimit(params.limit);
  const offset = clampOffset(params.offset);
  const sortBy = params.sortBy ?? "relevance";
  const location = params.location?.trim() ? params.location.trim() : null;
  const type = params.type ?? "all";

  // Businesses arrive in Phase 8. Unreachable from the route today (its schema
  // rejects `business`), so the zeros below are honest rather than a gap: there
  // are no businesses to search yet.
  if (type === "business") {
    return { results: [], counts: emptyCounts(), nextCursor: null };
  }

  const wantPosts = type === "all" || type === "post";
  const wantUsers = type === "all" || type === "user";
  const fetch = limit + offset;

  const [postRows, userRows, postCount, userCount] = await Promise.all([
    wantPosts
      ? searchRepo.searchPosts({
          query,
          viewerId: params.viewerId,
          limit: fetch,
          offset: 0,
          sortBy,
          location,
        })
      : Promise.resolve([]),
    wantUsers
      ? searchRepo.searchUsers({
          query,
          viewerId: params.viewerId,
          limit: fetch,
          offset: 0,
        })
      : Promise.resolve([]),
    searchRepo.countPosts({ query, viewerId: params.viewerId, location }),
    searchRepo.countUsers({ query }),
  ]);

  const posts = postRows.map(toPost);
  const users = userRows.map(toUser);

  let merged: SearchResult[];
  if (type === "post") {
    merged = posts.slice(offset, offset + limit);
  } else if (type === "user") {
    merged = users.slice(offset, offset + limit);
  } else {
    const combined = [...posts, ...users].sort((a, b) => b.rank - a.rank);
    merged = combined.slice(offset, offset + limit);
  }

  const nextOffset = offset + merged.length;
  const hasMore = nextOffset < (postCount + userCount) && merged.length > 0;

  return {
    results: merged,
    counts: { posts: postCount, users: userCount, businesses: 0 },
    nextCursor: hasMore ? String(nextOffset) : null,
  };
}

/**
 * What `/discover` shows with no query: trending, people to follow, recent.
 *
 * The three run in parallel — three independent reads, not one query three
 * times, and not a loop per post.
 */
export async function getDiscoveryData(viewerId: string): Promise<DiscoveryData> {
  const [trendingPosts, suggestedUsers, recentPosts] = await Promise.all([
    searchRepo.getTrendingPosts({ viewerId }),
    searchRepo.getSuggestedUsers({ viewerId }),
    searchRepo.getRecentPosts({ viewerId }),
  ]);

  return {
    trendingPosts: trendingPosts.map(toPost),
    suggestedUsers: suggestedUsers.map(toUser),
    recentPosts: recentPosts.map(toPost),
  };
}