import { z } from "zod";
import {
  COMMENT_BODY_MAX,
  FEED_PAGE_MAX,
  POST_BODY_MAX,
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

export const createPostSchema = z.object({
  body: z.string().min(1).max(POST_BODY_MAX),
  type: z.enum(POST_TYPES).optional(),
  location: z.string().max(200).nullish(),
  visibility: z.enum(VISIBILITIES).optional(),
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