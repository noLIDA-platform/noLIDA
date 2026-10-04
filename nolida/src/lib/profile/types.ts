/**
 * The shapes the profile UI renders.
 *
 * Declared here rather than in `profile.service.ts` because no component may
 * import from `src/lib/server/` — that rule exists so a server-only module can
 * never be dragged into a client bundle. `profile.service.ts` imports these and
 * returns them, so there is still exactly one definition of each shape and the
 * page hands them straight to a component with no translation step in between.
 */

/** One person, as a profile shows them. Every field is nullable: a profile row
 *  arrives a moment after the user, and half these are optional by design. */
export interface ProfileCard {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  /** ISO string, for the "Joined" line. */
  created_at: string;
}

export interface ProfileStatsCard {
  postsCount: number;
  followingCount: number;
  followersCount: number;
}

/**
 * A user's business, when it is public enough to appear on a profile.
 * `status` is always `APPROVED` here — the service filters.
 */
export interface ProfileBusinessCard {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  status: string;
}

export interface ProfileView {
  profile: ProfileCard;
  stats: ProfileStatsCard;
  isOwnProfile: boolean;
  isFollowing: boolean;
  business: ProfileBusinessCard | null;
}

/**
 * The profile tabs, in order.
 *
 * The active tab is a `?tab=` query parameter rather than client state, so the
 * tab you are on survives a refresh, can be linked to, and works before (or
 * entirely without) hydration. A tab bar is navigation; navigation that needs
 * JavaScript to have happened is navigation that has not happened yet.
 */
export const PROFILE_TABS = ["posts", "saved", "tagged", "about"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  posts: "Posts",
  saved: "Saved",
  tagged: "Tagged",
  about: "About",
};

/**
 * Coerce anything that arrived in a query string into a real tab.
 *
 * Falls back to `posts` rather than rendering nothing: a hand-edited or stale
 * `?tab=rot` should land on the default view, not on a blank page.
 */
export function parseProfileTab(value: string | string[] | undefined): ProfileTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return PROFILE_TABS.includes(candidate as ProfileTab)
    ? (candidate as ProfileTab)
    : "posts";
}

/** One tile in the profile grid. The grid does not need the whole post. */
export interface ProfilePostTile {
  id: string;
  /** Raw `posts.media`; read through `parsePostMedia` so a legacy shape cannot
   *  reach the renderer. */
  media: unknown;
  body: string;
  created_at: string;
  like_count?: number;
  comment_count?: number;
}