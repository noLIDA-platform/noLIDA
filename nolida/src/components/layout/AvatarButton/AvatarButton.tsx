import React from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import type { ShellUser } from "@/lib/client/shell-user";
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
 * The picture itself is the `Avatar` primitive's job, so the initials fallback
 * lives in exactly one place. This component adds only what is specific to a
 * control: the button element, the hover ring and the accessible name.
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
    size === "lg" ? "app-avatar--lg" : "",
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
      <Avatar src={user.avatarUrl} name={user.displayName} size={size} />
    </button>
  );
}