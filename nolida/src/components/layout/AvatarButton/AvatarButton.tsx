import React from "react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import type { ShellUser } from "@/lib/client/shell-user";
import "./AvatarButton.css";

export interface AvatarButtonProps {
  user: ShellUser;
  /** Invoked to open or close the menu controlled by the parent. */
  onClick: () => void;
  /** Whether the menu this button controls is currently open. */
  isOpen?: boolean;
  popupType?: "menu" | "dialog";
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
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
  isOpen = false,
  popupType = "menu",
  buttonRef,
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
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-haspopup={popupType}
      aria-expanded={isOpen}
      aria-label="Profile and settings"
      className={classes}
    >
      <Avatar src={user.avatarUrl} name={user.displayName} size={size} />
    </button>
  );
}