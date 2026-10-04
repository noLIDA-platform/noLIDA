import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { PostCard } from "@/components/feed/PostCard/PostCard";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getProfileForViewer } from "@/lib/server/services/profile.service";
import { getUserPosts } from "@/lib/server/services/feed.service";
import { toShellUser } from "@/lib/client/shell-user";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "./profile-view.css";

export const metadata: Metadata = {
  title: "Profile",
  description: "A NOlida profile and their posts.",
};

/**
 * `/profile/[id]` — someone else's profile.
 *
 * Reached from search results and from the follow button on a person card. It is
 * signed-in only, like the rest of `(main)`: it lives inside the app shell, and
 * a page that showed someone's profile to the open web would be a different
 * decision with different rules — that belongs with discovery, not here.
 *
 * A person who does not exist and a suspended account both 404, for the same
 * reason private posts 404 elsewhere: "it exists but you cannot see it" is
 * itself an answer worth withholding.
 *
 * The visitor's own profile redirects to `/profile`, which has the richer card.
 */
export default async function ProfileViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const { id } = await params;
  if (id === session.user.id) redirect("/profile");

  const profile = await getProfileForViewer(id);
  if (!profile) notFound();

  const posts = await getUserPosts({
    viewerId: session.user.id,
    userId: id,
    limit: FEED_PAGE_SIZE,
  });

  const viewer = toShellUser(session);
  const name =
    profile.display_name ?? profile.full_name ?? profile.username ?? "Someone";

  return (
    <div className="profile-view">
      <header className="profile-view__head">
        <Link href="/discover" className="profile-view__back">
          Back to discover
        </Link>

        <Avatar src={profile.avatar_url} name={name} size="xl" />

        <h1 className="profile-view__name">{name}</h1>
        {profile.username ? (
          <p className="profile-view__handle">@{profile.username}</p>
        ) : null}
        {profile.bio ? (
          <p className="profile-view__bio">{profile.bio}</p>
        ) : null}
        <p className="profile-view__joined">
          Member since{" "}
          {new Date(profile.created_at).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <section className="profile-view__posts">
        {posts.posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description="When this person posts, it will show up here."
          />
        ) : (
          <ul className="profile-view__list">
            {posts.posts.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  viewer={{
                    id: viewer.id,
                    displayName: viewer.displayName,
                    avatarUrl: viewer.avatarUrl,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}