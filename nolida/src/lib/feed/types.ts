/**
 * The feed's shared vocabulary.
 *
 * Client-safe on purpose: this module imports nothing from `src/lib/server/`,
 * so the repositories (server) and the feed components (client) describe posts
 * with the same types instead of drifting into two near-identical shapes.
 *
 * Timestamps are ISO strings, not `Date`. They arrive from `pg` as strings and
 * are rendered by `formatTimeAgo`, which accepts strings — so nothing has to be
 * serialised between a Server Component and a Client Component.
 */

/** The slice of a user that a post or comment shows next to it. */
export interface PostAuthor {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/** A post exactly as it is stored. */
export interface PostRow {
  id: string;
  user_id: string;
  business_id: string | null;
  type: string;
  body: string;
  location: string | null;
  category_id: string | null;
  media: unknown;
  metadata: Record<string, unknown>;
  visibility: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
}

/** A post joined to its author. */
export interface PostWithAuthor extends PostRow {
  author: PostAuthor;
}

/** A post plus the two flags that only make sense for one viewer. */
export interface PostWithViewerState extends PostWithAuthor {
  liked: boolean;
  saved: boolean;
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends CommentRow {
  author: PostAuthor;
  /** Present when the requesting viewer is known. */
  liked?: boolean;
}

/** What a feed returns: a page of posts and the cursor that follows it. */
export interface FeedPage {
  posts: PostWithViewerState[];
  nextCursor: string | null;
}

/** A person, as a follower/following list or a liker list shows them. */
export interface UserSummary {
  id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/** The signed-in viewer, in the shape the client components need. */
export interface FeedViewer {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Which feed a component is paging through. Decides the next-page URL. */
export type FeedKind = "home" | "user" | "saved";