import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Feed } from "@/components/feed/Feed/Feed";
import { toShellUser } from "@/lib/client/shell-user";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getHomeFeed } from "@/lib/server/services/feed.service";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "../feed-page.css";

export const metadata: Metadata = {
  title: "Home",
  description: "Posts from you and the people you follow.",
};

/**
 * `/home` — the composer and the feed, in one readable column.
 *
 * The first page of posts is fetched here, on the server, and handed to `Feed`
 * as a prop. That is why this page exists at all: the reader sees their feed in
 * the first HTML rather than an empty screen that fills in a moment later.
 * Paging past the first page is the browser's job.
 *
 * The session is re-read even though the `(main)` layout already refused anyone
 * without one. The page needs the viewer's id to ask for their feed, and a page
 * that renders a name must not rely on a parent having done its job.
 */
export default async function HomePage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const page = await getHomeFeed({
    viewerId: session.user.id,
    limit: FEED_PAGE_SIZE,
  });
  const user = toShellUser(session);

  return (
    <div className="feed-page">
      <div className="feed-page__column">
        <h1 className="sr-only">Home</h1>
        <Feed
          initialPosts={page.posts}
          initialCursor={page.nextCursor}
          feedType="home"
          viewer={{
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
          showComposer
        />
      </div>
    </div>
  );
}