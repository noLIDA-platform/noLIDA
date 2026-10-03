/**
 * Search and discovery types.
 *
 * One discriminated union, `{ type: ... }`, is the whole contract between the
 * search service and everything that renders results. The client switches on
 * `result.type` and never guesses: a renderer that has to test "does this have
 * an author?" breaks the moment a third kind of result exists.
 *
 * `business` became a real result in Phase 8B: `search.service.ts` merges
 * APPROVED businesses with posts and people, and `counts.businesses` is a real
 * count. Client-safe: no server imports, so Client Components may depend on it.
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
 * The slice of a business a result card needs.
 *
 * `slug` is carried because the card links to `/business/[slug]` — a result
 * without it would render with nowhere to go. `rank` is normalised to 0–1
 * for the same reason as posts and people: the three kinds are merged into
 * one ordered list in `search.service.ts`.
 *
 * Only APPROVED businesses ever reach this shape; the repository filters
 * by status in SQL, so no renderer has to remember to.
 */
export interface SearchBusiness {
  type: "business";
  id: string;
  slug: string;
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