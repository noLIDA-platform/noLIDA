import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import "./loading.css";

/**
 * `/my-business` — four stat-card skeletons mirroring the key-metrics row,
 * plus a wide band for the business-health card.
 *
 * Placed at `my-business/`, which also covers every dashboard sub-route:
 * a route segment uses its *nearest* `loading.tsx`.
 */
export default function Loading() {
  return (
    <div className="biz-overview" aria-hidden="true">
      <div className="biz-skeleton__health">
        <Skeleton width="45%" height="1.5rem" />
        <Skeleton width="30%" height="1rem" />
      </div>
      <div className="biz-skeleton__metrics">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="biz-skeleton__metric">
            <Skeleton width="60%" height="0.85rem" />
            <Skeleton width="40%" height="1.5rem" />
          </div>
        ))}
      </div>
    </div>
  );
}