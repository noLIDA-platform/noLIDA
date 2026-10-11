import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import "./loading.css";

/**
 * `/home` — three post-shaped skeletons in the feed column.
 *
 * A spinner says "something is loading"; this says "your feed is loading":
 * the page does not jump when the real cards arrive because the shapes
 * already hold their space.
 */
export default function Loading() {
  return (
    <div className="feed-page">
      <div className="feed-page__column">
        <h1 className="sr-only">Home</h1>
        {[0, 1, 2].map((index) => (
          <div key={index} className="feed-skeleton" aria-hidden="true">
            <div className="feed-skeleton__head">
              <Skeleton width={40} height={40} radius="50%" />
              <div className="feed-skeleton__who">
                <Skeleton width="45%" height="0.9rem" />
                <Skeleton width="30%" height="0.75rem" />
              </div>
            </div>
            <Skeleton width="92%" height="0.9rem" />
            <Skeleton width="68%" height="0.9rem" />
            <Skeleton width="100%" height={220} radius="var(--radius-md)" />
            <div className="feed-skeleton__actions">
              <Skeleton width={64} height="1.5rem" radius="999px" />
              <Skeleton width={64} height="1.5rem" radius="999px" />
              <Skeleton width={64} height="1.5rem" radius="999px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}