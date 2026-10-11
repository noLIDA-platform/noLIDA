import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import "./loading.css";

/**
 * `/profile` — header skeleton (avatar, name, stats) plus a 3-column grid
 * of nine square tiles, mirroring the posts grid at every width.
 */
export default function Loading() {
  return (
    <div className="profile-page">
      <div className="profile-skeleton" aria-hidden="true">
        <div className="profile-skeleton__head">
          <Skeleton width={84} height={84} radius="50%" />
          <div className="profile-skeleton__who">
            <Skeleton width="55%" height="1.25rem" />
            <Skeleton width="35%" height="0.85rem" />
            <div className="profile-skeleton__stats">
              <Skeleton width={64} height="2.5rem" radius="var(--radius-md)" />
              <Skeleton width={64} height="2.5rem" radius="var(--radius-md)" />
              <Skeleton width={64} height="2.5rem" radius="var(--radius-md)" />
            </div>
          </div>
        </div>
        <div className="profile-skeleton__grid">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <Skeleton key={index} width="100%" height="100%" radius="0" />
          ))}
        </div>
      </div>
    </div>
  );
}