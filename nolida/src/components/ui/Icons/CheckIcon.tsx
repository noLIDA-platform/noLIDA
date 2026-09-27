import React from "react";
import type { IconProps } from "./HomeIcon";

export function CheckIcon({
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
