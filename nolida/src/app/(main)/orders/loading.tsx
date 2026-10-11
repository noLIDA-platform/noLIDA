import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

/**
 * `/orders` — four request-card skeletons in the same list layout.
 * One shimmer block per visual slot, the same shape the real cards take.
 */
export default function Loading() {
  return (
    <div className="requests-page">
      <div className="requests-skeleton__list">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="request-skeleton">
            <div className="request-skeleton__avatar">
              <Skeleton width={40} height={40} radius="50%" />
            </div>
            <div className="request-skeleton__identity">
              <Skeleton width="62%" height="0.9rem" />
              <Skeleton width="38%" height="0.75rem" />
            </div>
            <Skeleton width="100%" height="0.95rem" />
            <Skeleton width="96%" height="0.95rem" />
            <div className="request-skeleton__meta">
              <Skeleton width="98%" height="0.65rem" />
              <Skeleton width="72%" height="0.65rem" />
              <Skeleton width="82%" height="0.65rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
