/**
 * Search and discovery types.
 *
 * One discriminated union, `{ type: ... }`, is the whole contract between the
 * search service and everything that renders results. The client switches on
 * `result.type` and never guesses: a renderer that has to test "does this have
 * an author?" breaks the moment a third kind of result exists.
 *
 * `business` is here on purpose, and is **always empty** until Phase 8. Adding
 * it later is a data change, not an API change — the union already admits it,
 * so no client has to be rewritten when businesses become searchable.
 *
 * Client-safe: no server imports, so Client Components may depend on it.
 */

export type SearchResultType = "post" | "user" | "business";

/** A post that matched. Counts are read, never a viewer flag. */
export interface SearchPost {
  type: "post";
  id: string;
  body: string;
  location: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  author: SearchPerson;
  /**
   * Relevance, **normalised to 0–1**. Raw `ts_rank` is not comparable across
   * result kinds — posts and people are ranked by different expressions on
   * different scales — so an unnormalised merge silently stacks one kind above
   * the other. See `search.repo.ts`.
   */
  rank: number;
}

/** The slice of a person a result card needs. */
export interface SearchPerson {
  id: string;
  username: string | null;
  full_name: string | null;
  /**
   * Carried alongside `full_name` so cards can use the same name precedence as
   * the rest of the app (`display_name ?? full_name ?? username`), instead of
   * quietly rendering a different name in one place than in another.
   */
  display_name: string | null;
  avatar_url: string | null;
}

export interface SearchUser {
  type: "user";
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  /** Truncated by the renderer, not the service. */
  bio: string | null;
  avatar_url: string | null;
  /**
   * Whether *the searching viewer* already follows this person.
   *
   * Carried on the result because the button has to be honest: a card that
   * always renders "Follow" invites a tap that silently does nothing, and one
   * that always renders "Following" hides the ability to unfollow. One
   * `EXISTS` in the same query costs nothing — it is not a per-row lookup.
   */
  is_following: boolean;
  rank: number;
}

/**
 * Placeholder for Phase 8.
 *
 * Declared so the contract admits businesses, never constructed today:
 * `search()` returns an empty business list and `counts.businesses` is always
 * 0. Keeping the shape honest now is cheaper than inventing it later.
 */
export interface SearchBusiness {
  type: "business";
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  rank: number;
}

export type SearchResult = SearchPost | SearchUser | SearchBusiness;

export interface SearchResponse {
  results: SearchResult[];
  /**
   * Totals per kind for the current query, **regardless of the `type` filter**
   * that produced `results`. That is what lets the UI show "12 posts · 3
   * people" as tabs with counts while only one kind is on screen.
   */
  counts: {
    posts: number;
    users: number;
    businesses: number;
  };
  /**
   * Offset cursor, not the `(created_at, id)` cursor the feed uses. Relevance
   * order is not stable across inserts, so a positional cursor would silently
   * skip or duplicate results while the user is paging. Offset can duplicate —
   * but it never lies about what it skipped.
   */
  nextCursor: string | null;
}

export type SearchSort = "relevance" | "recent" | "popular";

export interface SearchFilters {
  type?: SearchResultType | "all";
  location?: string;
  sortBy?: SearchSort;
}

/** What `/discover` shows before anyone types anything. */
export interface DiscoveryData {
  trendingPosts: SearchPost[];
  suggestedUsers: SearchUser[];
  recentPosts: SearchPost[];
}