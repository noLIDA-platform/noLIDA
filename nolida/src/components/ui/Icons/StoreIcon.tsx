import React from "react";
import type { IconProps } from "./HomeIcon";

export function StoreIcon({
  size = 24,
  className,
  "aria-hidden": ariaHidden = true,
}: IconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      <path d="M3 3h18v4H3z" />
      <path d="M3 7l2 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l2-12" />
      <path d="M9 11v6" />
      <path d="M15 11v6" />
    </svg>
  );
}
