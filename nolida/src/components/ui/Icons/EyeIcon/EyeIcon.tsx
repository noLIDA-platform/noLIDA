import React from "react";

export interface EyeIconProps {
  size?: number;
  /** Only needed when the icon is the sole carrier of its meaning. */
  ariaLabel?: string;
  className?: string;
}

/**
 * An open eye — "this value is hidden, tap to show it".
 *
 * Hand-drawn as inline SVG rather than pulled from `lucide-react` even though
 * the app otherwise uses Lucide, because `Icon` requires a `LucideIcon`
 * component and these two need to sit *inside* a control's own label rather
 * than be rendered by it. That keeps the reveal button a normal button with an
 * `aria-label`, instead of an icon that has to be labelled from the outside.
 *
 * The geometry matches the house style: 24×24 viewBox, `fill="none"`,
 * `stroke="currentColor"`, `strokeWidth` 2, round caps and joins.
 */
export function EyeIcon({
  size = 24,
  ariaLabel,
  className,
}: EyeIconProps): React.JSX.Element {
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
      {/* The almond: the classic eye outline, wide and shallow. */}
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      {/* The pupil. */}
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}