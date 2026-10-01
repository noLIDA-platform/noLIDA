import React from "react";
import { initialsOf } from "@/lib/client/shell-user";
import "./Avatar.css";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  /** A profile photo URL. Absent for almost everyone until uploads exist. */
  src?: string | null;
  /** The person's name, used only to derive the fallback initials. */
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * A person's picture, or the initials that stand in for one.
 *
 * A Server Component with no state, and deliberately no link: an avatar is used
 * in contexts that are already links (a post header) and contexts that are not
 * (the drawer), so wrapping it here would nest anchors half the time. The
 * caller decides.
 *
 * The fallback is not an edge case — photo upload does not exist yet, so the
 * gradient circle is what everyone sees today. It uses `initialsOf` so the
 * letters match the name printed beside them, and the whole element is
 * `aria-hidden`: the name is always present as text, and announcing it twice is
 * worse than not announcing it at all.
 */
export function Avatar({
  src,
  name,
  size = "md",
  className,
}: AvatarProps): React.JSX.Element {
  const classes = ["ui-avatar", `ui-avatar--${size}`, className ?? ""]
    .filter(Boolean)
    .join(" ");

  if (src) {
    return (
      <span className={classes} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="ui-avatar__img"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  const fallbackName = name?.trim() ? name.trim() : "?";

  return (
    <span className={classes} aria-hidden="true">
      {initialsOf(fallbackName)}
    </span>
  );
}