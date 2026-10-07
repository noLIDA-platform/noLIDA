import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon/Icon";
import { ProfileAbout } from "@/components/profile/ProfileAbout/ProfileAbout";
import { ProfileHeader } from "@/components/profile/ProfileHeader/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs/ProfileTabs";
import { PostsGrid } from "@/components/profile/PostsGrid/PostsGrid";
import { StartConversationButton } from "@/components/messaging/StartConversationButton/StartConversationButton";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getProfileByUsername } from "@/lib/server/services/profile.service";
import { getUserPosts } from "@/lib/server/services/feed.service";
import { parseProfileTab, type ProfilePostTile } from "@/lib/profile/types";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "@/components/profile/profile-page.css";

export const metadata: Metadata = {
  title: "Profile",
  description: "A NOlida profile and their posts.",
};

/**
 * `/user/[username]` — someone else's profile.
 *
 * Keyed by handle rather than by id, because a profile URL is the one thing
 * people put in a message. `/user/ada` can be said out loud; a UUID cannot, and
 * an id-based URL leaks how many accounts exist.
 *
 * Three things are deliberate here:
 *
 * - Your own handle redirects to `/profile`, so there is exactly one page that
 *   offers "Edit profile" and never two that disagree about what you may do.
 * - An unknown handle and a suspended account both 404. "It exists but you
 *   cannot see it" is itself an answer worth withholding — the same rule private
 *   posts follow everywhere else.
 * - Visibility is not filtered here. `getUserPosts` already applies
 *   `VISIBLE_TO_VIEWER` in SQL, so a FOLLOWERS-only post is excluded before it
 *   is read, and the grid cannot accidentally show one.
 */
export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const { username } = await params;
  const tab = parseProfileTab((await searchParams).tab);

  const data = await getProfileByUsername({
    viewerId: session.user.id,
    username,
  });
  if (!data) notFound();

  // One profile, one URL. Your own handle never renders a follow button you
  // cannot use.
  if (data.profile.id === session.user.id) redirect("/profile");

  let posts: ProfilePostTile[] = [];
  if (tab === "posts") {
    const page = await getUserPosts({
      viewerId: session.user.id,
      userId: data.profile.id,
      limit: FEED_PAGE_SIZE,
    });
    posts = page.posts;
  }

  const name =
    data.profile.display_name ??
    data.profile.full_name ??
    data.profile.username ??
    "Someone";

  return (
    <div className="profile-page">
      <ProfileHeader
        profile={data.profile}
        stats={data.stats}
        isOwnProfile={false}
        isFollowing={data.isFollowing}
        business={data.business}
      />

      <ProfileTabs
        activeTab={tab}
        isOwnProfile={false}
        username={data.profile.username}
      />

      {tab === "posts" ? (
        <PostsGrid
          posts={posts}
          emptyTitle={`${name} has not posted yet`}
          emptyDescription="When they post something, it will appear here."
        />
      ) : null}

      {tab === "tagged" ? (
        <div className="profile-page__empty">
          <p className="profile-page__empty-title">
            <Icon as={UserRound} size={20} />
            No tags yet
          </p>
          <p className="profile-page__empty-body">
            When people tag {name} in a post, it will show up here.
          </p>
        </div>
      ) : null}

      {tab === "about" ? (
        <ProfileAbout profile={data.profile} isOwnProfile={false} />
      ) : null}
    </div>
  );
}