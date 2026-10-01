import { z } from "zod";

/**
 * Request schemas for search.
 *
 * Everything arrives as a query string, so everything arrives as text. `z`
 * coerces and bounds it here rather than trusting it further in.
 */

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(["all", "post", "user"]).optional().default("all"),
  location: z.string().trim().max(120).optional(),
  sortBy: z.enum(["relevance", "recent", "popular"]).optional().default("relevance"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).max(500).optional().default(0),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;