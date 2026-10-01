import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Feed } from "@/components/feed/Feed/Feed";
import { toShellUser } from "@/lib/client/shell-user";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getSavedPosts } from "@/lib/server/services/feed.service";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "../feed-page.css";

export const metadata: Metadata = {
  title: "Saved posts",
  description: "Posts you bookmarked to come back to.",
};

/**
 * `/favorites` — posts the viewer saved.
 *
 * Always the session's own saves: there is no path parameter, so the route
 * cannot be pointed at someone else's list. Empty is a normal state here and is
 * drawn by `Feed`, with a line explaining how to fill it.
 */
export default async function FavoritesPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const page = await getSavedPosts({
    userId: session.user.id,
    limit: FEED_PAGE_SIZE,
  });
  const user = toShellUser(session);

  return (
    <div className="feed-page">
      <div className="feed-page__column">
        <h1 className="mp-title">Saved posts</h1>
        <Feed
          initialPosts={page.posts}
          initialCursor={page.nextCursor}
          feedType="saved"
          viewer={{
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
        />
      </div>
    </div>
  );
}