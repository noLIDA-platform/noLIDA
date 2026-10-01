import React from "react";
import "./DiscoverySection.css";

export interface DiscoverySectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Renders a "See all" link on the right when provided. */
  onSeeAll?: () => void;
  className?: string;
}

/**
 * A titled band of discovery content.
 *
 * A plain wrapper: the heading is semantic (`h2`), and the caller decides
 * whether the row scrolls or grids. An empty section renders nothing at all —
 * "Trending now" with nothing in it is worse than no section, because it
 * advertises a section that cannot be filled.
 */
export function DiscoverySection({
  title,
  subtitle,
  children,
  onSeeAll,
  className,
}: DiscoverySectionProps): React.JSX.Element | null {
  const hasChildren = React.Children.count(children) > 0;
  if (!hasChildren) return null;

  const classes = ["discovery-section", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      <div className="discovery-section__head">
        <div>
          <h2 className="discovery-section__title">{title}</h2>
          {subtitle ? (
            <p className="discovery-section__subtitle">{subtitle}</p>
          ) : null}
        </div>

        {onSeeAll ? (
          <button
            type="button"
            className="discovery-section__see-all"
            onClick={onSeeAll}
          >
            See all
          </button>
        ) : null}
      </div>

      <div className="discovery-section__body">{children}</div>
    </section>
  );
}