import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

/**
 * `/notifications` — six rows, each an icon or a circle plus two bars.
 * A spinner would announce "loading"; this announces "this is where the
 * notification will sit".
 */
export default function Loading() {
  return (
    <div className="notifications-skeleton">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div key={index} className="notifications-skeleton__row">
          <Skeleton width={36} height={36} radius="50%" />
          <div>
            <Skeleton width="58%" height="0.6rem" />
            <Skeleton width="92%" height="0.7rem" />
          </div>
        </div>
      ))}
    </div>
  );
}
