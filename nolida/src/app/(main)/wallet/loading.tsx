import { Skeleton } from "@/components/ui/Skeleton/Skeleton";

/**
 * `/wallet` — the balance card plus three stacked transactions.
 * A spinner says "something is loading"; this says "your wallet is loading".
 */
export default function Loading() {
  return (
    <div className="wallet-skeleton">
      <div className="wallet-skeleton__card">
        <div className="wallet-skeleton__balance">
          <Skeleton width="70%" height="1rem" />
          <Skeleton width="60%" height="2.6rem" radius="var(--radius-md)" />
        </div>
        <div className="wallet-skeleton__options">
          <Skeleton width="38%" height="0.8rem" />
          <Skeleton width="34%" height="0.8rem" />
          <Skeleton width="42%" height="0.8rem" />
        </div>
      </div>
      <div className="wallet-skeleton__rows">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Skeleton width="100%" height="0.65rem" />
            <Skeleton width="76%" height="0.55rem" />
            <Skeleton width="55%" height="0.45rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
