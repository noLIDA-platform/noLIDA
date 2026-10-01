"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { apiFetch } from "@/lib/client/api";
import type { SearchUser } from "@/types/search";
import "./UserResultCard.css";

export interface UserResultCardProps {
  user: SearchUser;
  viewerId: string;
  className?: string;
}

/**
 * A person in search results or the "People to follow" row.
 *
 * The button's initial label comes from `user.is_following`, which the query
 * computes with the rest of the row. That is the whole reason that flag is on
 * the type: a card that always says "Follow" invites a tap that silently does
 * nothing, and one that always says "Following" makes unfollowing impossible
 * to find.
 *
 * Following is optimistic — the label flips immediately and is put back if the
 * request fails — for the same reason likes are.
 */
export function UserResultCard({
  user,
  viewerId,
  className,
}: UserResultCardProps): React.JSX.Element {
  const [following, setFollowing] = useState(user.is_following);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = user.display_name ?? user.full_name ?? user.username ?? "Someone";
  const isSelf = user.id === viewerId;
  const classes = ["user-result", className ?? ""].filter(Boolean).join(" ");

  const toggleFollow = async (): Promise<void> => {
    if (busy) return;
    const wasFollowing = following;

    setFollowing(!wasFollowing);
    setBusy(true);
    setError(null);

    const result = await apiFetch(`/api/follows/${user.id}`, {
      method: wasFollowing ? "DELETE" : "POST",
    });

    if (!result.ok) {
      setFollowing(wasFollowing);
      setError(result.error.message);
    }
    setBusy(false);
  };

  return (
    <article className={classes}>
      <Link href={`/profile/${user.id}`} className="user-result__link">
        <Avatar src={user.avatar_url} name={name} size="lg" />

        <span className="user-result__identity">
          <span className="user-result__name">{name}</span>
          {user.username ? (
            <span className="user-result__handle">@{user.username}</span>
          ) : null}
          {user.bio ? (
            <span className="user-result__bio">{user.bio}</span>
          ) : null}
        </span>
      </Link>

      <div className="user-result__action">
        {isSelf ? (
          <span className="user-result__self">This is you</span>
        ) : (
          <Button
            size="sm"
            variant={following ? "secondary" : "primary"}
            onClick={() => void toggleFollow()}
            disabled={busy}
            aria-pressed={following}
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {error ? (
        <p className="user-result__error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}