import * as searchRepo from "@/lib/server/repositories/search.repo";
import * as publicBusinessesRepo from "@/lib/server/repositories/publicBusinesses.repo";
import type {
  DiscoveryData,
  SearchPost,
  SearchResponse,
  SearchResult,
  SearchResultType,
  SearchSort,
  SearchUser,
  SearchBusiness,
} from "@/types/search";

/**
 * Search and discovery.
 *
 * The seam between "how results are found" and "what a result is". The
 * repository is the only thing that knows about `tsvector`, trigrams, or rank
 * arithmetic; the routes and components only ever see the shapes in
 * `@/types/search`.
 *
 * That boundary is the whole point. When NOlida outgrows Postgres full-text
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
   * Which kinds of result to return. `all` merges posts, people and
   * businesses by rank; each specific type returns only that kind.
   *
   * Businesses became real in Phase 8B (they were a stub in Phase 6), so the
   * route's schema now accepts `business` too and the union member is
   * constructed by `toBusiness` below.
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

function toBusiness(row: publicBusinessesRepo.BusinessSearchRow): SearchBusiness {
  return {
    type: "business",
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    location: row.location,
    rank: Number(row.rank) || 0,
  };
}

/**
 * Searches posts, people and businesses.
 *
 * `type: "all"` merges the three kinds by `rank`. Because rank is normalised
 * to 0–1 on all three sides (see `search.repo.ts` and
 * `publicBusinesses.repo.ts`), the merge is meaningful — an unnormalised
 * merge would just stack whichever kind happened to return bigger numbers.
 * Ties keep each side's own ordering, because `Array.sort` is stable.
 *
 * Offsets apply to the *merged* list, so each kind is fetched with
 * `limit + offset` rows and the slice is taken after the merge. Fetching only
 * `limit` per side would make page two wrong.
 *
 * Counts are always for all three kinds regardless of the `type` filter —
 * that is what lets the UI show tabs with honest totals while rendering one.
 * Business search is APPROVED-only by construction: `searchBusinesses`
 * filters in SQL, so a draft business can never appear in `counts.businesses`
 * either. A count that included hidden rows would be a leak with extra steps.
 */
export async function search(params: SearchParams): Promise<SearchResponse> {
  const query = normaliseQuery(params.query);
  const limit = clampLimit(params.limit);
  const offset = clampOffset(params.offset);
  const sortBy = params.sortBy ?? "relevance";
  const location = params.location?.trim() ? params.location.trim() : null;
  const type = params.type ?? "all";

  const wantPosts = type === "all" || type === "post";
  const wantUsers = type === "all" || type === "user";
  const wantBusinesses = type === "all" || type === "business";
  const fetch = limit + offset;

  const [postRows, userRows, businessRows, postCount, userCount, businessCount] =
    await Promise.all([
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
      wantBusinesses
        ? publicBusinessesRepo.searchBusinesses({
            query,
            limit: fetch,
            offset: 0,
          })
        : Promise.resolve([]),
      searchRepo.countPosts({ query, viewerId: params.viewerId, location }),
      searchRepo.countUsers({ query }),
      publicBusinessesRepo.countBusinesses({ query }),
    ]);

  const posts = postRows.map(toPost);
  const users = userRows.map(toUser);
  const businesses = businessRows.map(toBusiness);

  let merged: SearchResult[];
  if (type === "post") {
    merged = posts.slice(offset, offset + limit);
  } else if (type === "user") {
    merged = users.slice(offset, offset + limit);
  } else if (type === "business") {
    merged = businesses.slice(offset, offset + limit);
  } else {
    const combined = [...posts, ...users, ...businesses].sort(
      (a, b) => b.rank - a.rank,
    );
    merged = combined.slice(offset, offset + limit);
  }

  const nextOffset = offset + merged.length;
  const hasMore =
    nextOffset < (postCount + userCount + businessCount) && merged.length > 0;

  return {
    results: merged,
    counts: { posts: postCount, users: userCount, businesses: businessCount },
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