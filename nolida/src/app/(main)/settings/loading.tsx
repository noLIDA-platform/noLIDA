import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

/**
 * `/settings` — four grouped sections: a header bar plus three row bars each.
 * A spinner would say "something is loading"; this says "this is what will
 * sit here".
 */
export default function Loading() {
  return (
    <div className="settings-skeleton">
      {[0, 1, 2, 3].map((section) => (
        <div key={section} className="settings-skeleton__group">
          <Skeleton width="46%" height="1.1rem" />
          <div className="settings-skeleton__rows">
            <Skeleton width="100%" height="0.7rem" />
            <Skeleton width="82%" height="0.7rem" />
            <Skeleton width="66%" height="0.7rem" />
          </div>
        </div>
      ))}
    </div>
  );
}
