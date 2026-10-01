import { withTransaction } from "@/lib/db/client";
import * as postsRepo from "@/lib/server/repositories/posts.repo";
import type { PostCounts } from "@/lib/server/repositories/posts.repo";
import * as postLikesRepo from "@/lib/server/repositories/postLikes.repo";
import * as postCommentsRepo from "@/lib/server/repositories/postComments.repo";
import * as commentLikesRepo from "@/lib/server/repositories/commentLikes.repo";
import * as postSharesRepo from "@/lib/server/repositories/postShares.repo";
import * as savedPostsRepo from "@/lib/server/repositories/savedPosts.repo";
import * as followsRepo from "@/lib/server/repositories/follows.repo";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import { COMMENT_BODY_MAX, SHARE_CHANNELS } from "@/lib/feed/constants";
import type { CommentWithAuthor } from "@/lib/feed/types";
import { ServiceError } from "./service-error";

/**
 * Every way one person can act on another's content.
 *
 * Two rules hold across the whole file:
 *
 * 1. **Idempotent.** Liking twice, saving twice, sharing twice and following
 *    twice all succeed and change the counter once. The UNIQUE constraints in
 *    migration 005 are the arbiter — never a read-then-write, which two
 *    requests can interleave.
 * 2. **Atomic.** Where a row and a counter move together (a like and
 *    `like_count`), they move inside one transaction. A crash between them
 *    would leave the counter permanently wrong and nothing would ever notice.
 */

/** Interactions only act on posts the actor is allowed to read. */
async function assertPostVisible(
  postId: string,
  viewerId: string
): Promise<void> {
  if (!(await postsRepo.canView(postId, viewerId))) {
    throw new ServiceError("NOT_FOUND", "That post is not available.");
  }
}

/** The authoritative counters, read back after the transaction commits. */
async function requireCounts(postId: string): Promise<PostCounts> {
  const counts = await postsRepo.getCounts(postId);
  if (!counts) throw new ServiceError("NOT_FOUND", "That post is not available.");
  return counts;
}

function normaliseCommentBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new ServiceError("INVALID", "A comment cannot be empty.");
  }
  if (trimmed.length > COMMENT_BODY_MAX) {
    throw new ServiceError(
      "INVALID",
      `A comment can be at most ${COMMENT_BODY_MAX} characters.`
    );
  }
  return trimmed;
}

function normaliseChannel(channel: string | undefined): string | undefined {
  if (channel === undefined) return undefined;
  if (!(SHARE_CHANNELS as readonly string[]).includes(channel)) {
    throw new ServiceError("INVALID", "Unknown share channel.");
  }
  return channel;
}

export async function likePost(input: {
  userId: string;
  postId: string;
}): Promise<PostCounts> {
  await assertPostVisible(input.postId, input.userId);

  await withTransaction(async (client) => {
    const inserted = await postLikesRepo.add(
      { postId: input.postId, userId: input.userId },
      client
    );
    // Already liked: the row was not new, so the count must not move.
    if (inserted) await postsRepo.incrementLikeCount(input.postId, 1, client);
  });

  return requireCounts(input.postId);
}

export async function unlikePost(input: {
  userId: string;
  postId: string;
}): Promise<PostCounts> {
  await assertPostVisible(input.postId, input.userId);

  await withTransaction(async (client) => {
    const removed = await postLikesRepo.remove(
      { postId: input.postId, userId: input.userId },
      client
    );
    if (removed) await postsRepo.incrementLikeCount(input.postId, -1, client);
  });

  return requireCounts(input.postId);
}

export async function commentOnPost(input: {
  userId: string;
  postId: string;
  body: string;
  parentId?: string | null;
}): Promise<{ comment: CommentWithAuthor; counts: PostCounts }> {
  await assertPostVisible(input.postId, input.userId);
  const body = normaliseCommentBody(input.body);

  if (input.parentId) {
    const parent = await postCommentsRepo.findWithAuthorById(input.parentId);
    // A reply must point at a comment on the same post; otherwise a crafted
    // parentId could graft a reply onto someone else's thread.
    if (!parent || parent.post_id !== input.postId) {
      throw new ServiceError("NOT_FOUND", "The comment you replied to is gone.");
    }
  }

  const comment = await withTransaction(async (client) => {
    const created = await postCommentsRepo.create(
      {
        postId: input.postId,
        userId: input.userId,
        parentId: input.parentId ?? null,
        body,
      },
      client
    );
    await postsRepo.incrementCommentCount(input.postId, 1, client);
    return created;
  });

  return { comment, counts: await requireCounts(input.postId) };
}

export async function deleteComment(input: {
  userId: string;
  commentId: string;
}): Promise<{ postId: string; counts: PostCounts }> {
  const comment = await postCommentsRepo.findWithAuthorById(input.commentId);
  if (!comment) {
    throw new ServiceError("NOT_FOUND", "That comment no longer exists.");
  }
  if (comment.user_id !== input.userId) {
    throw new ServiceError("FORBIDDEN", "You can only delete your own comments.");
  }

  // Replies cascade away with their parent, so the post's count must drop by
  // everything that disappears, not just the one row asked for.
  const replies = await postCommentsRepo.countReplies(input.commentId);

  await withTransaction(async (client) => {
    await postCommentsRepo.remove(input.commentId, client);
    await postsRepo.incrementCommentCount(comment.post_id, -(1 + replies), client);
  });

  const counts = await postsRepo.getCounts(comment.post_id);
  return {
    postId: comment.post_id,
    counts: counts ?? { like_count: 0, comment_count: 0, share_count: 0 },
  };
}

export async function likeComment(input: {
  userId: string;
  commentId: string;
}): Promise<{ likeCount: number }> {
  // Checked first: a like on a comment that no longer exists must be a 404, not
  // a foreign-key violation dressed up as a 500.
  const comment = await postCommentsRepo.findWithAuthorById(input.commentId);
  if (!comment) {
    throw new ServiceError("NOT_FOUND", "That comment no longer exists.");
  }

  await withTransaction(async (client) => {
    const inserted = await commentLikesRepo.add(
      { commentId: input.commentId, userId: input.userId },
      client
    );
    if (inserted) {
      await postCommentsRepo.incrementLikeCount(input.commentId, 1, client);
    }
  });
  return { likeCount: await postCommentsRepo.getLikeCount(input.commentId) };
}

export async function unlikeComment(input: {
  userId: string;
  commentId: string;
}): Promise<{ likeCount: number }> {
  const comment = await postCommentsRepo.findWithAuthorById(input.commentId);
  if (!comment) {
    throw new ServiceError("NOT_FOUND", "That comment no longer exists.");
  }

  await withTransaction(async (client) => {
    const removed = await commentLikesRepo.remove(
      { commentId: input.commentId, userId: input.userId },
      client
    );
    if (removed) {
      await postCommentsRepo.incrementLikeCount(input.commentId, -1, client);
    }
  });
  return { likeCount: await postCommentsRepo.getLikeCount(input.commentId) };
}

export async function sharePost(input: {
  userId: string;
  postId: string;
  channel?: string;
}): Promise<PostCounts> {
  await assertPostVisible(input.postId, input.userId);
  const channel = normaliseChannel(input.channel);

  await withTransaction(async (client) => {
    const inserted = await postSharesRepo.create(
      { postId: input.postId, userId: input.userId, channel },
      client
    );
    if (inserted) await postsRepo.incrementShareCount(input.postId, 1, client);
  });

  return requireCounts(input.postId);
}

export async function savePost(input: {
  userId: string;
  postId: string;
}): Promise<{ saved: boolean }> {
  await assertPostVisible(input.postId, input.userId);
  await savedPostsRepo.add({ postId: input.postId, userId: input.userId });
  return { saved: true };
}

export async function unsavePost(input: {
  userId: string;
  postId: string;
}): Promise<{ saved: boolean }> {
  await savedPostsRepo.remove({ postId: input.postId, userId: input.userId });
  return { saved: false };
}

export async function followUser(input: {
  followerId: string;
  followingId: string;
}): Promise<{ following: boolean }> {
  if (input.followerId === input.followingId) {
    throw new ServiceError("INVALID", "You cannot follow yourself.");
  }

  // Checked here so a bad id is a 404 rather than a foreign-key violation
  // surfacing as a 500. The `follows_no_self` constraint still guards the same
  // rule in SQL.
  const target = await usersRepo.findById(input.followingId);
  if (!target) {
    throw new ServiceError("NOT_FOUND", "That account does not exist.");
  }

  await followsRepo.follow(input);
  return { following: true };
}

export async function unfollowUser(input: {
  followerId: string;
  followingId: string;
}): Promise<{ following: boolean }> {
  await followsRepo.unfollow(input);
  return { following: false };
}
