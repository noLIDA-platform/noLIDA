import React from "react";
import { initialsOf, type ShellUser } from "@/lib/client/shell-user";
import "./AvatarButton.css";

export interface AvatarButtonProps {
  user: ShellUser;
  /** Opens the profile drawer. */
  onClick: () => void;
  /** Whether the drawer this button controls is currently open. */
  expanded: boolean;
  /** Larger circle for the drawer header. */
  size?: "md" | "lg";
  className?: string;
}

/**
 * The signed-in user's avatar, doubling as the trigger for the profile drawer.
 *
 * Avatar photos are not uploaded yet, so the fallback is not a corner case: it
 * is what everyone sees. `initialsOf` keeps it honest to the name that appears
 * beside it.
 *
 * The accessible name describes the action ("Profile and settings") rather than
 * the picture, because the picture is the person, not the destination.
 */
export function AvatarButton({
  user,
  onClick,
  expanded,
  size = "md",
  className,
}: AvatarButtonProps): React.JSX.Element {
  const classes = [
    "app-avatar",
    `app-avatar--${size}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label="Profile and settings"
      className={classes}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="app-avatar__img"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden="true">{initialsOf(user.displayName)}</span>
      )}
    </button>
  );
}