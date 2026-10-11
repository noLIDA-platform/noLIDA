import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import "./loading.css";

/** `/discover` — six card skeletons in the result grid. */
export default function Loading() {
  return (
    <div className="discover-page">
      <div aria-hidden="true">
        <Skeleton width="60%" height="2rem" radius="var(--radius-md)" />
        <div className="discover-skeleton__grid">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="discover-skeleton__card">
              <div className="discover-skeleton__row">
                <Skeleton width={44} height={44} radius="50%" />
                <div className="discover-skeleton__who">
                  <Skeleton width="70%" height="0.9rem" />
                  <Skeleton width="45%" height="0.75rem" />
                </div>
              </div>
              <Skeleton width="100%" height="0.8rem" />
              <Skeleton width="80%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}