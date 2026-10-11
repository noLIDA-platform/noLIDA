import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import "./loading.css";

/** `/messages` — six conversation-row skeletons: avatar + name + preview. */
export default function Loading() {
  return (
    <div className="messages-page">
      <div className="messages-skeleton" aria-hidden="true">
        <Skeleton width="40%" height="1.75rem" radius="var(--radius-md)" />
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="messages-skeleton__row">
            <Skeleton width={48} height={48} radius="50%" />
            <div className="messages-skeleton__body">
              <div className="messages-skeleton__top">
                <Skeleton width="35%" height="0.9rem" />
                <Skeleton width={48} height="0.75rem" />
              </div>
              <Skeleton width="75%" height="0.8rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}