/**
 * Feed constants shared by the server and the browser.
 *
 * Client-safe: no server imports. The composer renders the visibility choices
 * from here, and the service validates against the same list, so the two can
 * never disagree about what a valid post looks like.
 */

export const POST_TYPES = [
  "GENERAL_POST",
  "BUSINESS_POST",
  "SERVICE_POST",
  "PRODUCT_POST",
  "REQUEST_POST",
  "OFFER_POST",
  "AVAILABILITY_POST",
  "JOB_REQUEST_POST",
  "ANNOUNCEMENT_POST",
  "RECOMMENDATION_POST",
] as const;

export type PostType = (typeof POST_TYPES)[number];

export const VISIBILITIES = ["PUBLIC", "FOLLOWERS", "PRIVATE"] as const;

export type Visibility = (typeof VISIBILITIES)[number];

/** Shares carry why the share happened; only these are recorded. */
export const SHARE_CHANNELS = ["COPY_LINK", "WHATSAPP", "CONVERSATION"] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

/** Mirrors `posts_body_length` in migration 005. */
export const POST_BODY_MAX = 5000;

/** Mirrors `comments_body_length` in migration 005. */
export const COMMENT_BODY_MAX = 2000;

/** Default and maximum page size for every feed endpoint. */
export const FEED_PAGE_SIZE = 20;
export const FEED_PAGE_MAX = 50;

/**
 * A post carries at most four media items, images and videos mixed.
 *
 * Four is a layout decision as much as a limit: it is exactly the set of grids
 * PostCard knows how to lay out (single, pair, trio, 2x2). A fifth item would
 * need a "+N" overlay that is not built, so the cap matches the design rather
 * than the other way round.
 */
export const POST_MEDIA_MAX = 4;

/** One attachment on a post. The shape stored in `posts.media`. */
export interface PostMediaItem {
  url: string;
  type: "image" | "video";
}

/**
 * Parse `posts.media` from the database into typed items.
 *
 * The column is JSONB with no CHECK on its contents, so `pg` hands back whatever
 * is there — including `[]`, `null`, or something a future migration writes. The
 * composer and PostCard both render this, so it is normalised in ONE place
 * rather than each guarding separately.
 *
 * A malformed entry is dropped rather than rendered: an entry with no usable
 * https URL is not something any component should be asked to put in an `src`.
 */
export function parsePostMedia(raw: unknown): PostMediaItem[] {
  if (!Array.isArray(raw)) return [];

  const items: PostMediaItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;

    const candidate = entry as { url?: unknown; type?: unknown };

    if (typeof candidate.url !== "string" || candidate.url.length === 0) continue;
    if (!candidate.url.startsWith("https://")) continue;

    // Anything not explicitly "video" is treated as an image, so a future
    // writer of `{"url": "..."}` still renders instead of vanishing.
    const type = candidate.type === "video" ? "video" : "image";

    items.push({ url: candidate.url, type });
    if (items.length === POST_MEDIA_MAX) break;
  }
  return items;
}

/** Human labels for the visibility selector, in the order it renders. */
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Anyone can see this",
  FOLLOWERS: "Only your followers",
  PRIVATE: "Only you",
};