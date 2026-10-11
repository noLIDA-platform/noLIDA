import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Feed } from "@/components/feed/Feed/Feed";
import { FirstLoginTour } from "@/components/onboarding/FirstLoginTour/FirstLoginTour";
import { toShellUser } from "@/lib/client/shell-user";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getHomeFeed } from "@/lib/server/services/feed.service";
import { getOwnProfile } from "@/lib/server/services/profile.service";
import { countByUser } from "@/lib/server/repositories/posts.repo";
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
 *
 * First visit only, the page also decides whether to show the first-login
 * tour (Phase 10.2): the profile's `onboarding_completed_at` is null AND the
 * user has never posted. Either fact alone is not enough — a returning user
 * who skipped the tour and later posted must not be greeted by it, and a
 * brand-new user who posted from /create before ever opening /home still
 * deserves the walkthrough. The count reuses the visibility-aware
 * `countByUser`, so a user whose only posts are private still counts as
 * "has posted".
 */
export default async function HomePage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const page = await getHomeFeed({
    viewerId: session.user.id,
    limit: FEED_PAGE_SIZE,
  });
  const user = toShellUser(session);

  // Read together with the feed would be nicer, but `getOwnProfile` throws
  // when the row is missing while `getHomeFeed` does not — sequencing keeps
  // the failure modes separate. Two extra indexed queries on one page
  // load is the price of showing the tour exactly once.
  let showTour = false;
  try {
    const profile = await getOwnProfile(session.user.id);
    if (profile.onboarding_completed_at === null) {
      const posts = await countByUser({
        userId: session.user.id,
        viewerId: session.user.id,
      });
      showTour = posts === 0;
    }
  } catch {
    // No profile row, no tour. The feed below still renders.
    showTour = false;
  }

  return (
    <div className="feed-page">
      <div className="feed-page__column">
        <h1 className="sr-only">Home</h1>
        {showTour ? <FirstLoginTour /> : null}
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