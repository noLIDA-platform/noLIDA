import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon/Icon";
import { UserRound } from "lucide-react";
import { ProfileAbout } from "@/components/profile/ProfileAbout/ProfileAbout";
import { ProfileHeader } from "@/components/profile/ProfileHeader/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs/ProfileTabs";
import { PostsGrid } from "@/components/profile/PostsGrid/PostsGrid";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getProfileData } from "@/lib/server/services/profile.service";
import {
  getSavedPosts,
  getUserPosts,
} from "@/lib/server/services/feed.service";
import {
  parseProfileTab,
  type ProfilePostTile,
} from "@/lib/profile/types";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "@/components/profile/profile-page.css";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your NOlida name, verification status and account details.",
};

/**
 * `/profile` — the signed-in user's own profile.
 *
 * Header, tabs, then one panel. The tabs are a `?tab=` query parameter rather
 * than client state, so a refresh keeps you where you were and
 * `/profile?tab=saved` is a link you can send someone.
 *
 * The counts and the grid are fetched for the active tab only. Fetching every
 * tab's data up front would pay for two lists nobody is looking at.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const tab = parseProfileTab((await searchParams).tab);

  const data = await getProfileData({
    viewerId: session.user.id,
    userId: session.user.id,
  });
  // Your own account cannot be missing, but a redirect is a better failure than
  // a page of undefined values.
  if (!data) redirect("/");

  // Only the active tab's list is fetched.
  let posts: ProfilePostTile[] = [];
  if (tab === "posts") {
    const page = await getUserPosts({
      viewerId: session.user.id,
      userId: session.user.id,
      limit: FEED_PAGE_SIZE,
    });
    posts = page.posts;
  } else if (tab === "saved") {
    const page = await getSavedPosts({
      userId: session.user.id,
      limit: FEED_PAGE_SIZE,
    });
    posts = page.posts;
  }

  return (
    <div className="profile-page">
      <ProfileHeader
        profile={data.profile}
        stats={data.stats}
        isOwnProfile={data.isOwnProfile}
        isFollowing={data.isFollowing}
        business={data.business}
      />

      <ProfileTabs
        activeTab={tab}
        isOwnProfile
        username={data.profile.username}
      />

      {tab === "posts" ? (
        <PostsGrid
          posts={posts}
          emptyTitle="You have not posted yet"
          emptyDescription="Share a photo, a thought or something you made. It will show up here."
        />
      ) : null}

      {tab === "saved" ? (
        <PostsGrid
          posts={posts}
          emptyTitle="Nothing saved yet"
          emptyDescription="Save a post from the feed and it will be waiting here."
        />
      ) : null}

      {tab === "tagged" ? (
        <div className="profile-page__empty">
          <p className="profile-page__empty-title">
            <Icon as={UserRound} size={20} />
            No tags yet
          </p>
          <p className="profile-page__empty-body">
            When people tag you in a post, it will show up here.
          </p>
        </div>
      ) : null}

      {tab === "about" ? (
        <ProfileAbout
          profile={data.profile}
          isOwnProfile
          emailVerified={Boolean(session.user.email_verified_at)}
          phoneVerified={Boolean(session.user.phone_verified_at)}
        />
      ) : null}
    </div>
  );
}