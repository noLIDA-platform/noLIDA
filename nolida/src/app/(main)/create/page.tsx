import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostComposer } from "@/components/feed/PostComposer/PostComposer";
import { toShellUser } from "@/lib/client/shell-user";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import "../feed-page.css";

export const metadata: Metadata = {
  title: "Create a post",
  description: "Share something with the people who follow you.",
};

/**
 * `/create` — the composer on its own page, for the bottom nav's centre button.
 *
 * The same `PostComposer` the feed uses, with `redirectTo="/home"` so a post
 * started here ends where people will look for it. Two entry points, one
 * component: a second composer would be a second set of rules to keep in step.
 */
export default async function CreatePage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const user = toShellUser(session);

  return (
    <div className="feed-page">
      <div className="feed-page__column">
        <h1 className="mp-title">Create a post</h1>
        <PostComposer
          viewer={{
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
          large
          redirectTo="/home"
        />
      </div>
    </div>
  );
}