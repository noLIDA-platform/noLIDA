import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostCard } from "@/components/feed/PostCard/PostCard";
import { toShellUser } from "@/lib/client/shell-user";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getPostForViewer } from "@/lib/server/services/feed.service";
import "../../feed-page.css";

export const metadata: Metadata = {
  title: "Post",
  description: "A post on NOlida.",
};

/**
 * `/post/[id]` — one post, for the link that "Copy link" and "Share to
 * WhatsApp" hand to someone.
 *
 * Signed-in only, because it lives inside the `(main)` group: the shell, the
 * nav and the comment thread all assume a session. That is a deliberate
 * difference from a genuinely public page — showing a stranger's post to the
 * open web is a separate decision, with its own rules, and belongs with
 * discovery rather than here.
 *
 * A post the viewer may not see, and a post that does not exist, both land on
 * `/home`. Distinguishing them would tell someone that a particular private
 * post is real.
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const { id } = await params;
  const post = await getPostForViewer({
    viewerId: session.user.id,
    postId: id,
  });

  if (!post) redirect("/home");

  const user = toShellUser(session);

  return (
    <div className="feed-page">
      <div className="feed-page__column">
        <h1 className="sr-only">Post</h1>
        <PostCard
          post={post}
          viewer={{
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
          commentsOpenByDefault
        />
      </div>
    </div>
  );
}