import React from "react";
import { Spinner, type SpinnerSize } from "@/components/ui/Spinner/Spinner";
import "./PageLoader.css";

export interface PageLoaderProps {
  /** Announced to screen readers and shown as the label under the spinner. */
  label?: string;
  size?: SpinnerSize;
  className?: string;
}

/**
 * The shared `loading.tsx` body (Phase 8F).
 *
 * ## Why this exists
 *
 * Every route under `(main)` is `force-dynamic` — the session cookie is read on
 * each request — so every navigation is a real server round trip. Without a
 * `loading.tsx`, Next.js holds the *previous* screen until the new one is ready,
 * and the tap looks like it did nothing for a second or two. With one, the
 * shell swaps to this immediately and the interaction reads as "it responded".
 *
 * It reuses the existing `Spinner` primitive rather than a second CSS spinner:
 * one animation, one definition, and the `role="status" aria-label="Loading"`
 * accessibility contract already ships with it.
 *
 * ## Why it is centred and short
 *
 * `min-height: 50vh`, not `100vh`. A full-height loader sits exactly where the
 * content will appear, which makes the swap feel like a flash; half-height
 * keeps the change of state legible without the layout jumping.
 */
export function PageLoader({
  label = "Loading",
  size = "lg",
  className,
}: PageLoaderProps): React.JSX.Element {
  const classes = ["page-loader", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <Spinner size={size} />
      <p className="page-loader__label">{label}</p>
    </div>
  );
}

export default PageLoader;