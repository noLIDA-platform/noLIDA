import React from "react";
import type { LucideIcon } from "lucide-react";

export interface IconProps {
  /** A Lucide icon component, e.g. `Search` or `ShoppingCart`. */
  as: LucideIcon;
  /** Rendered width and height in pixels. Defaults to 24. */
  size?: number;
  /** Stroke weight. Defaults to 1.75 — the design-system standard. */
  strokeWidth?: number;
  className?: string;
  /**
   * Supply ONLY when the icon carries meaning no adjacent text conveys.
   * When set, the icon becomes `role="img"` with an accessible name.
   * When omitted, the icon is marked `aria-hidden="true"` as decorative.
   */
  ariaLabel?: string;
}

/**
 * Enforces one stroke weight and one sizing convention across every icon in
 * the app. Icons are decorative by default; pass `ariaLabel` only when the icon
 * is the sole carrier of its meaning.
 *
 * Prefer labelling the interactive control instead — `<button aria-label="Close">`
 * with a decorative icon inside — over labelling the icon itself.
 */
export function Icon({
  as: IconComponent,
  size = 24,
  strokeWidth = 1.75,
  className,
  ariaLabel,
}: IconProps): React.JSX.Element {
  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...(ariaLabel
        ? { role: "img" as const, "aria-label": ariaLabel }
        : { "aria-hidden": true })}
    />
  );
}
