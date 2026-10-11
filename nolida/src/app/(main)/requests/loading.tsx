import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

/**
 * `/requests` — skeletons for the active request card, stacked four-tall.
 *
 * One shimmer block per visual slot: avatar, name bar, title bar, description
 * bar, meta bar. A spinner would say "something is loading" — this says "your
 * request feed is loading".
 */
export default function Loading() {
  return (
    <div className="requests-page">
      <div className="requests-head">
        <h1 className="sr-only">Requests</h1>
        <div className="requests-skeleton__actions">
          <Skeleton width={96} height="1.4rem" radius="999px" />
        </div>
      </div>

      <nav aria-hidden="true">
        <div className="requests-skeleton__tabs">
          <Skeleton width={64} height="1.4rem" radius="var(--radius-md)" />
          <Skeleton width={64} height="1.4rem" radius="var(--radius-md)" />
        </div>
      </nav>

      <ul className="requests-skeleton__list">
        {[0, 1, 2, 3].map((index) => (
          <li key={index} className="request-skeleton">
            <div className="request-skeleton__avatar">
              <Skeleton width={40} height={40} radius="50%" />
            </div>
            <div className="request-skeleton__identity">
              <Skeleton width="60%" height="0.9rem" />
              <Skeleton width="40%" height="0.75rem" />
            </div>
            <Skeleton width="100%" height="0.95rem" />
            <Skeleton width="94%" height="0.95rem" />
            <div className="request-skeleton__meta">
              <Skeleton width="96%" height="0.65rem" />
              <Skeleton width="70%" height="0.65rem" />
              <Skeleton width="80%" height="0.65rem" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
