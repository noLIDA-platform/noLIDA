import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Feed } from "@/components/feed/Feed/Feed";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { toShellUser } from "@/lib/client/shell-user";
import { getUserPosts } from "@/lib/server/services/feed.service";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "./posts.css";

export const metadata: Metadata = { title: "Business posts" };

/**
 * `/my-business/posts` — the owner's own posts, in the Phase 5B Feed (Phase 8C).
 *
 * ## Temporary: filtered by user, not by business
 *
 * This lists **every post by the owner**, not only ones about the business.
 * `posts.business_id` exists in the schema (migration 005 reserved it without a
 * foreign key) but nothing sets it — the composer's business picker is a later
 * phase — so `WHERE business_id = $1` would return an empty page forever.
 *
 * Filtering by `user_id` is the honest approximation and is what an owner
 * expects to see on "my business posts" today. **When posts gain a
 * `business_id` writer, this switches to `getBusinessPosts` and the UI is
 * unchanged.** The alternative — showing an empty list — would look broken.
 *
 * `getUserPosts` still applies the real `VISIBLE_TO_VIEWER` predicate: an owner
 * sees their own PRIVATE posts and nothing they are not allowed to see, which
 * is the same rule the rest of the app uses.
 */
export default async function MyBusinessPostsPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const page = await getUserPosts({
    viewerId: session.user.id,
    userId: session.user.id,
    limit: FEED_PAGE_SIZE,
  });

  const viewer = toShellUser(session);

  return (
    <div className="business-posts">
      <header className="business-posts__header">
        <h1>Posts</h1>
        <p className="business-posts__intro">
          Everything you have posted. Posts you link to your business will be
          grouped here in a later phase.
        </p>
      </header>

      <Feed
        initialPosts={page.posts}
        initialCursor={page.nextCursor}
        feedType="user"
        userId={session.user.id}
        viewer={{
          id: viewer.id,
          displayName: viewer.displayName,
          avatarUrl: viewer.avatarUrl,
        }}
        showComposer
      />
    </div>
  );
}
