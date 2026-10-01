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

/** Human labels for the visibility selector, in the order it renders. */
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Anyone can see this",
  FOLLOWERS: "Only your followers",
  PRIVATE: "Only you",
};