/**
 * End-to-end feed check at the service layer.
 *
 * Drives the real repositories and services against the real database — no
 * mocks — so it proves the SQL, the visibility rules, the idempotency and the
 * transaction boundaries, not just that the functions return.
 *
 * Two accounts are created so the follow/visibility path can be exercised: a
 * feed that only ever sees your own posts cannot prove it filters anything.
 *
 * Everything it creates is deleted at the end; `users` cascades to posts,
 * likes, comments and follows.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/test-feed.ts
 */
import { getPool } from "@/lib/db/client";
import { register, verifyOtp } from "@/lib/server/services/auth.service";
import { createPost, deletePost } from "@/lib/server/services/post.service";
import {
  getHomeFeed,
  getSavedPosts,
  getUserPosts,
} from "@/lib/server/services/feed.service";
import * as interaction from "@/lib/server/services/interaction.service";
import { ServiceError } from "@/lib/server/services/service-error";

const PASSWORD = "TestPassword123";
const stamp = Date.now();

let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail = ""): void {
  checks += 1;
  if (ok) {
    console.log(`PASS ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

/** Registers a verified account, reading the dev-printed OTP off the console. */
async function makeUser(email: string): Promise<string> {
  const captured: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    captured.push(args.map((a) => String(a)).join(" "));
  };
  let userId: string;
  try {
    const result = await register({ email, password: PASSWORD });
    userId = result.userId;
  } finally {
    console.log = original;
  }

  let code: string | null = null;
  for (const line of captured) {
    const match = line.match(/code=(\d{6})/);
    if (match) code = match[1] ?? null;
  }
  if (!code) throw new Error(`Could not read OTP for ${email}`);

  await verifyOtp({ identifier: email, code, purpose: "REGISTER" });
  return userId;
}

/** Asserts that `fn` throws a ServiceError carrying `code`. */
async function expectCode(
  name: string,
  code: string,
  fn: () => Promise<unknown>
): Promise<void> {
  try {
    await fn();
    check(name, false, "expected a throw, got none");
  } catch (error) {
    const actual = error instanceof ServiceError ? error.code : "not a ServiceError";
    check(name, actual === code, `expected ${code}, got ${actual}`);
  }
}
async function main(): Promise<void> {
  const aliceEmail = `feed-alice-${stamp}@nolida.test`;
  const bobEmail = `feed-bob-${stamp}@nolida.test`;
  let alice = "";
  let bob = "";

  try {
    alice = await makeUser(aliceEmail);
    bob = await makeUser(bobEmail);
    check("two accounts created and verified", Boolean(alice && bob));

    // ── Creating and reading ────────────────────────────────────────────
    const post = await createPost({
      userId: alice,
      body: "First post from the feed test.  https://nolida.example and #launch",
      location: "Ikeja",
    });
    check("createPost returns a post with an author", Boolean(post.author.id));

    const aliceFeed = await getHomeFeed({ viewerId: alice });
    check(
      "own public post appears in own feed",
      aliceFeed.posts.some((p) => p.id === post.id)
    );
    check(
      "a stranger sees a PUBLIC post",
      (await getHomeFeed({ viewerId: bob })).posts.some((p) => p.id === post.id)
    );

    // ── Likes: idempotent, and the count tracks it ──────────────────────
    const liked = await interaction.likePost({ userId: bob, postId: post.id });
    check("likePost increments like_count", liked.like_count === 1);

    const likedAgain = await interaction.likePost({ userId: bob, postId: post.id });
    check("liking twice is a no-op", likedAgain.like_count === 1);

    const bobFeed = await getHomeFeed({ viewerId: bob });
    const seenByBob = bobFeed.posts.find((p) => p.id === post.id);
    check("liked flag is attached per viewer", seenByBob?.liked === true);
    check(
      "saved flag is false for a post nobody saved",
      (await getHomeFeed({ viewerId: bob })).posts.find((p) => p.id === post.id)
        ?.saved === false
    );

    const unlike = await interaction.unlikePost({ userId: bob, postId: post.id });
    check("unlikePost decrements like_count", unlike.like_count === 0);
    await interaction.likePost({ userId: bob, postId: post.id });

    // ── Comments ────────────────────────────────────────────────────────
    const { comment, counts } = await interaction.commentOnPost({
      userId: bob,
      postId: post.id,
      body: "Nice one",
    });
    check("commentOnPost increments comment_count", counts.comment_count === 1);
    check("comment carries its author", comment.author.id === bob);

    const commentLiked = await interaction.likeComment({
      userId: alice,
      commentId: comment.id,
    });
    check("comment like increments", commentLiked.likeCount === 1);

    // Same user again — a second tap, not a second person.
    const reliked = await interaction.likeComment({
      userId: alice,
      commentId: comment.id,
    });
    check("liking a comment twice is a no-op", reliked.likeCount === 1);

    // The comment belongs to bob, so alice is the outsider here.
    await expectCode(
      "deleting someone else's comment is FORBIDDEN",
      "FORBIDDEN",
      () => interaction.deleteComment({ userId: alice, commentId: comment.id })
    );
    const deleted = await interaction.deleteComment({
      userId: bob,
      commentId: comment.id,
    });
    check("own comment deletes and decrements", deleted.counts.comment_count === 0);

    // ── Shares and saves ────────────────────────────────────────────────
    const shared = await interaction.sharePost({
      userId: bob,
      postId: post.id,
      channel: "COPY_LINK",
    });
    check("sharePost increments share_count", shared.share_count === 1);
    const sharedAgain = await interaction.sharePost({
      userId: bob,
      postId: post.id,
      channel: "COPY_LINK",
    });
    check("sharing the same channel twice is a no-op", sharedAgain.share_count === 1);
    const whatsappByBob = await interaction.sharePost({
      userId: bob,
      postId: post.id,
      channel: "WHATSAPP",
    });
    check("a different channel counts separately", whatsappByBob.share_count === 2);

    const whatsappByAlice = await interaction.sharePost({
      userId: alice,
      postId: post.id,
      channel: "WHATSAPP",
    });
    check("another person sharing counts too", whatsappByAlice.share_count === 3);

    await interaction.savePost({ userId: bob, postId: post.id });
    await interaction.savePost({ userId: bob, postId: post.id });
    const saved = await getSavedPosts({ userId: bob });
    check("savePost is idempotent and lists once", saved.posts.length === 1);
    check(
      "saved flag is attached in the feed",
      (await getHomeFeed({ viewerId: bob })).posts.find((p) => p.id === post.id)
        ?.saved === true
    );
    await interaction.unsavePost({ userId: bob, postId: post.id });
    check(
      "unsave empties the saved list",
      (await getSavedPosts({ userId: bob })).posts.length === 0
    );

    // ── Visibility: the rule that makes the feed worth having ───────────
    const carol = await makeUser(`feed-carol-${stamp}@nolida.test`);

    await interaction.followUser({ followerId: bob, followingId: alice });
    check(
      "following twice is a no-op",
      (await interaction.followUser({ followerId: bob, followingId: alice }))
        .following === true
    );
    await expectCode(
      "following yourself is INVALID",
      "INVALID",
      () => interaction.followUser({ followerId: alice, followingId: alice })
    );

    const followersOnly = await createPost({
      userId: alice,
      body: "For my followers only",
      visibility: "FOLLOWERS",
    });
    const privatePost = await createPost({
      userId: alice,
      body: "Nobody but me",
      visibility: "PRIVATE",
    });

    const bobSees = await getHomeFeed({ viewerId: bob });
    const carolSees = await getHomeFeed({ viewerId: carol });
    const aliceSees = await getHomeFeed({ viewerId: alice });

    check(
      "a follower sees FOLLOWERS posts",
      bobSees.posts.some((p) => p.id === followersOnly.id)
    );
    check(
      "a non-follower does not",
      !carolSees.posts.some((p) => p.id === followersOnly.id)
    );
    check(
      "the author sees their own PRIVATE post",
      aliceSees.posts.some((p) => p.id === privatePost.id)
    );
    check(
      "nobody else sees a PRIVATE post",
      !bobSees.posts.some((p) => p.id === privatePost.id) &&
        !carolSees.posts.some((p) => p.id === privatePost.id)
    );
    check(
      "a saved PRIVATE post is hidden once it stops being visible",
      !(await getSavedPosts({ userId: bob })).posts.some(
        (p) => p.id === privatePost.id
      )
    );

    await interaction.unfollowUser({ followerId: bob, followingId: alice });
    check(
      "unfollowing hides FOLLOWERS posts again",
      !(await getHomeFeed({ viewerId: bob })).posts.some(
        (p) => p.id === followersOnly.id
      )
    );
    await interaction.followUser({ followerId: bob, followingId: alice });

    // ── Deleting, and ownership ─────────────────────────────────────────
    await expectCode(
      "deleting someone else's post is FORBIDDEN",
      "FORBIDDEN",
      () => deletePost({ userId: bob, postId: post.id })
    );
    await expectCode(
      "editing someone else's post is FORBIDDEN",
      "FORBIDDEN",
      async () => {
        const { updatePost } = await import("@/lib/server/services/post.service");
        return updatePost({ userId: bob, postId: post.id, body: "hijacked" });
      }
    );

    await deletePost({ userId: alice, postId: post.id });
    check(
      "a deleted post leaves the feed",
      !(await getHomeFeed({ viewerId: bob })).posts.some((p) => p.id === post.id)
    );
    await expectCode(
      "acting on a deleted post is NOT_FOUND",
      "NOT_FOUND",
      () => interaction.likePost({ userId: bob, postId: post.id })
    );

    const alicePosts = await getUserPosts({
      viewerId: bob,
      userId: alice,
      limit: 50,
    });
    check(
      "a user's posts exclude what the viewer may not read",
      alicePosts.posts.every((p) => p.id !== privatePost.id)
    );
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL flow - ${error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)}`
    );
  } finally {
    // `users` cascades to posts, likes, comments, saves and follows, so
    // deleting the accounts removes everything this script created.
    await getPool().query(
      "DELETE FROM users WHERE email LIKE $1",
      [`feed-%-${stamp}@nolida.test`]
    );
    console.log("\nCleaned up test accounts.");
  }

  console.log(`\n${checks} checks, ${failures} failures`);
  await getPool().end();
}

main().catch(async (error) => {
  console.error("Feed test crashed:", error);
  try {
    await getPool().end();
  } catch {
    // ignore shutdown errors
  }
  process.exit(1);
});