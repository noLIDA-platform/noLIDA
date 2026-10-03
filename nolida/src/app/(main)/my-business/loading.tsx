import { PageLoader } from "@/components/ui/PageLoader/PageLoader";

/**
 * `/my-business` — a closer loading boundary than the `(main)` group one.
 *
 * Placed at `my-business/`, which also covers every dashboard sub-route: a route
 * segment uses its *nearest* `loading.tsx`, so `/my-business/services` picks this
 * up rather than the group-level one.
 */
export default function Loading() {
  return <PageLoader label="Loading your business" />;
}