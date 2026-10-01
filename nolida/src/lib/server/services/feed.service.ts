import * as postsRepo from "@/lib/server/repositories/posts.repo";
import * as postLikesRepo from "@/lib/server/repositories/postLikes.repo";
import * as savedPostsRepo from "@/lib/server/repositories/savedPosts.repo";
import { FEED_PAGE_MAX, FEED_PAGE_SIZE } from "@/lib/feed/constants";
import type {
  FeedPage,
  PostWithAuthor,
  PostWithViewerState,
} from "@/lib/feed/types";

/**
 * Reading posts, and the one place that decides what a "page" is.
 *
 * This service never loads a post twice or asks the database a question per
 * post. The viewer's `liked` and `saved` flags — which are per-viewer, so they
 * cannot be joined into the page query cleanly — are resolved with exactly two
 * batched lookups for the whole page, whatever its size.
 */

function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return FEED_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(limit), 1), FEED_PAGE_MAX);
}

/**
 * Attaches `liked` and `saved` to a page of posts.
 *
 * Two queries total, regardless of `rows.length`: one for every like, one for
 * every save. Asking per post — the N+1 pattern — would be 40 round-trips for a
 * 20-post page.
 */
async function attachViewerState(
  viewerId: string,
  rows: PostWithAuthor[]
): Promise<PostWithViewerState[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [likedIds, savedIds] = await Promise.all([
    postLikesRepo.listPostIds(viewerId, ids),
    savedPostsRepo.listPostIds(viewerId, ids),
  ]);

  const liked = new Set(likedIds);
  const saved = new Set(savedIds);

  return rows.map((row) => ({
    ...row,
    liked: liked.has(row.id),
    saved: saved.has(row.id),
  }));
}

export async function getHomeFeed(input: {
  viewerId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<FeedPage> {
  const limit = clampLimit(input.limit);
  const page = await postsRepo.listFeed({
    viewerId: input.viewerId,
    limit,
    cursor: input.cursor,
  });

  return {
    posts: await attachViewerState(input.viewerId, page.rows),
    nextCursor: page.nextCursor,
  };
}

export async function getUserPosts(input: {
  viewerId: string;
  userId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<FeedPage> {
  const limit = clampLimit(input.limit);
  const page = await postsRepo.listByUser({
    userId: input.userId,
    viewerId: input.viewerId,
    limit,
    cursor: input.cursor,
  });

  return {
    posts: await attachViewerState(input.viewerId, page.rows),
    nextCursor: page.nextCursor,
  };
}

/** A saved list is read by the person who saved it, so viewer === owner. */
export async function getSavedPosts(input: {
  userId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<FeedPage> {
  const limit = clampLimit(input.limit);
  const page = await postsRepo.listSavedByUser({
    userId: input.userId,
    limit,
    cursor: input.cursor,
  });

  return {
    posts: await attachViewerState(input.userId, page.rows),
    nextCursor: page.nextCursor,
  };
}

/**
 * A single post with its viewer flags, for the permalink page and the
 * `GET /api/posts/[id]` route. `null` means "no such post, or not yours to
 * see" — the two are never distinguished to the caller.
 */
export async function getPostForViewer(input: {
  viewerId: string;
  postId: string;
}): Promise<PostWithViewerState | null> {
  const post = await postsRepo.findForViewer(input.postId, input.viewerId);
  if (!post) return null;

  const [liked, saved] = await Promise.all([
    postLikesRepo.hasLiked({ postId: input.postId, userId: input.viewerId }),
    savedPostsRepo.hasSaved({ postId: input.postId, userId: input.viewerId }),
  ]);

  return { ...post, liked, saved };
}