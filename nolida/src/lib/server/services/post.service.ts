import * as postsRepo from "@/lib/server/repositories/posts.repo";
import {
  POST_BODY_MAX,
  POST_TYPES,
  VISIBILITIES,
  type PostType,
  type Visibility,
} from "@/lib/feed/constants";
import type { PostWithAuthor } from "@/lib/feed/types";
import { ServiceError } from "./service-error";

/**
 * Post lifecycle: create, edit, delete. Reading is the feed service's job.
 *
 * The route validates first; this validates again. That is not redundancy for
 * its own sake — the repository is reachable from scripts and future services,
 * and a rule enforced only at the edge is a rule that holds only at the edge.
 */

/** Trims, then enforces the same boundaries as the `posts_body_length` CHECK. */
function normaliseBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new ServiceError("INVALID", "A post cannot be empty.");
  }
  // JS length counts UTF-16 units, so it is never shorter than Postgres's
  // char_length — comparing here can only be stricter, never laxer.
  if (trimmed.length > POST_BODY_MAX) {
    throw new ServiceError(
      "INVALID",
      `A post can be at most ${POST_BODY_MAX} characters.`
    );
  }
  return trimmed;
}

function normaliseType(type: string | undefined): PostType | undefined {
  if (type === undefined) return undefined;
  if (!(POST_TYPES as readonly string[]).includes(type)) {
    throw new ServiceError("INVALID", "Unknown post type.");
  }
  return type as PostType;
}

function normaliseVisibility(
  visibility: string | undefined
): Visibility | undefined {
  if (visibility === undefined) return undefined;
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    throw new ServiceError("INVALID", "Unknown visibility.");
  }
  return visibility as Visibility;
}

export async function createPost(input: {
  userId: string;
  body: string;
  type?: string;
  location?: string | null;
  visibility?: string;
}): Promise<PostWithAuthor> {
  const body = normaliseBody(input.body);
  const type = normaliseType(input.type);
  const visibility = normaliseVisibility(input.visibility);
  const location = input.location?.trim() ? input.location.trim() : null;

  const created = await postsRepo.create({
    userId: input.userId,
    body,
    type,
    location,
    visibility,
  });

  const post = await postsRepo.findWithAuthorById(created.id);
  if (!post) throw new ServiceError("NOT_FOUND", "The post could not be read back.");
  return post;
}

/**
 * Loads a post and asserts the caller wrote it.
 *
 * A missing post and someone else's post are deliberately distinct here — the
 * author editing their own post needs "not found" and "not yours" to read
 * differently, and by this point they already know both exist.
 */
async function assertOwnership(
  userId: string,
  postId: string
): Promise<PostWithAuthor> {
  const post = await postsRepo.findWithAuthorById(postId);
  if (!post) throw new ServiceError("NOT_FOUND", "That post no longer exists.");
  if (post.user_id !== userId) {
    throw new ServiceError("FORBIDDEN", "You can only change your own posts.");
  }
  return post;
}

export async function updatePost(input: {
  userId: string;
  postId: string;
  body: string;
}): Promise<PostWithAuthor> {
  await assertOwnership(input.userId, input.postId);

  const body = normaliseBody(input.body);
  await postsRepo.updateBody(input.postId, body);

  const updated = await postsRepo.findWithAuthorById(input.postId);
  if (!updated) throw new ServiceError("NOT_FOUND", "That post no longer exists.");
  return updated;
}

/** Deleting a post cascades to its likes, comments and saves. */
export async function deletePost(input: {
  userId: string;
  postId: string;
}): Promise<void> {
  await assertOwnership(input.userId, input.postId);
  await postsRepo.remove(input.postId);
}