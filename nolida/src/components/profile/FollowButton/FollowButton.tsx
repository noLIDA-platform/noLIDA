"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { apiFetch } from "@/lib/client/api";
import "./FollowButton.css";

export type FollowButtonSize = "sm" | "md" | "lg";

export interface FollowButtonProps {
  userId: string;
  /** From the server query. A button that always said "Follow" would invite a tap
   *  that silently does nothing, and one that always said "Following" would make
   *  unfollowing impossible. */
  initialFollowing: boolean;
  size?: FollowButtonSize;
  className?: string;
}

/**
 * Follow / unfollow, optimistically.
 *
 * The label flips on click and is put back if the request fails, the same rule
 * the like and save buttons use. A round trip before the button reacts makes
 * following feel broken on a slow connection — and on a phone in Nigeria, that is
 * most of the time.
 *
 * The hover label is a second, `aria-hidden` span rather than a text swap in JS:
 * the button keeps ONE accessible name that always describes the current state,
 * and the "Unfollow" hint is pure decoration for a mouse.
 */
export function FollowButton({
  userId,
  initialFollowing,
  size = "md",
  className,
}: FollowButtonProps): React.JSX.Element {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (): Promise<void> => {
    if (busy) return;
    const wasFollowing = following;

    // Optimistic. Reverted below on failure — never left to drift.
    setFollowing(!wasFollowing);
    setBusy(true);
    setError(null);

    const result = await apiFetch(`/api/follows/${userId}`, {
      method: wasFollowing ? "DELETE" : "POST",
    });

    if (!result.ok) {
      setFollowing(wasFollowing);
      setError(result.error.message);
    }
    setBusy(false);
  };

  return (
    <span
      className={["follow-button", className ?? ""].filter(Boolean).join(" ")}
    >
      <Button
        size={size}
        variant={following ? "secondary" : "primary"}
        onClick={() => void toggle()}
        loading={busy}
        aria-pressed={following}
        ariaLabel={following ? "Unfollow this person" : "Follow this person"}
        className={[
          "follow-button__control",
          following ? "follow-button__control--following" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {following ? (
          <>
            <span className="follow-button__idle">Following</span>
            {/* Decorative: the accessible name above already says what the
                button will do. */}
            <span className="follow-button__hover" aria-hidden="true">
              Unfollow
            </span>
          </>
        ) : (
          "Follow"
        )}
      </Button>

      {error ? (
        <span className="follow-button__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}