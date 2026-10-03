import React from "react";

export interface EyeOffIconProps {
  size?: number;
  /** Only needed when the icon is the sole carrier of its meaning. */
  ariaLabel?: string;
  className?: string;
}

/**
 * The same eye with a slash through it — "this value is visible, tap to hide
 * it". The inverse state of `EyeIcon`, same geometry and same 24×24 house
 * style, so the two do not shift by a pixel when the toggle flips.
 *
 * The slash runs corner to corner (`3 3` → `21 21`) and is drawn last so it
 * sits over the outline; stroke-linecap is round so it does not look cut off.
 */
export function EyeOffIcon({
  size = 24,
  ariaLabel,
  className,
}: EyeOffIconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(ariaLabel
        ? { role: "img" as const, "aria-label": ariaLabel }
        : { "aria-hidden": true })}
      className={className}
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}