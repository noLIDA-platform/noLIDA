import { z } from "zod";
import {
  COMMENT_BODY_MAX,
  FEED_PAGE_MAX,
  POST_BODY_MAX,
  POST_MEDIA_MAX,
  POST_TYPES,
  SHARE_CHANNELS,
  VISIBILITIES,
} from "@/lib/feed/constants";

/**
 * Request schemas for the feed API.
 *
 * These are the boundary. The service validates again, and the database holds
 * the final CHECK constraints — three layers, because the rule "a post is 1 to
 * 5000 characters" should survive a new caller that skips all of them but one.
 */

/**
 * One attachment on a post.
 *
 * https-only, and deliberately NOT "any URL the client likes": `posts.media` is
 * rendered straight into an `<img src>` and a `<video src>`, so a `javascript:`
 * value would be a stored XSS on every reader's page. A post may only reference
 * an https asset.
 *
 * This does NOT prove the URL is one we uploaded. A user can put any https URL
 * here, including someone else's image — that is hotlinking, not a security
 * hole, and it is what every social platform allows.
 */
const mediaItemSchema = z.object({
  url: z.url().max(2048).refine((value) => value.startsWith("https://"), {
    message: "Media must be an https URL.",
  }),
  type: z.enum(["image", "video"]),
});

export const createPostSchema = z.object({
  body: z.string().min(1).max(POST_BODY_MAX),
  type: z.enum(POST_TYPES).optional(),
  location: z.string().max(200).nullish(),
  visibility: z.enum(VISIBILITIES).optional(),
  media: z.array(mediaItemSchema).max(POST_MEDIA_MAX).optional(),
});

export const updatePostSchema = z.object({
  body: z.string().min(1).max(POST_BODY_MAX),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(COMMENT_BODY_MAX),
  parentId: z.uuid().nullish(),
});

export const shareSchema = z.object({
  channel: z.enum(SHARE_CHANNELS).optional(),
});

/**
 * `limit` arrives as a string, so it is coerced and bounded here rather than
 * trusted. `cursor` is opaque: the repository decides whether it parses, and a
 * malformed one just means "first page".
 */
export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(FEED_PAGE_MAX).optional(),
  cursor: z.string().max(200).optional(),
});