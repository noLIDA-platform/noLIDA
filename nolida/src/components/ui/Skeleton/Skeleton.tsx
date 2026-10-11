import "./Skeleton.css";

export interface SkeletonProps {
  /** CSS length. Defaults to 100% of the parent. */
  width?: string | number;
  /** CSS length. No default — a skeleton with no height is invisible. */
  height?: string | number;
  /** CSS border-radius. Defaults to the tokenised small radius. */
  radius?: string;
  className?: string;
}

/**
 * One gray pulsing block with a shimmer sweep (Phase 10.2).
 *
 * The loading shapes every `loading.tsx` builds are assembled from these —
 * a spinner says "something is loading"; a skeleton says "this is what will
 * be here", so the page does not jump when it arrives. Colors come only from
 * tokens (`--color-bg-subtle` / `--color-border`), which is what makes the
 * same block read correctly in both themes.
 *
 * A Server Component on purpose: skeletons are rendered inside `loading.tsx`
 * boundaries, which must ship no JavaScript of their own.
 */
export function Skeleton({
  width,
  height = "1rem",
  radius,
  className,
}: SkeletonProps): React.JSX.Element {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;
  if (radius !== undefined) style.borderRadius = radius;

  return (
    <span
      aria-hidden="true"
      className={className ? `ui-skeleton ${className}` : "ui-skeleton"}
      style={style}
    />
  );
}
