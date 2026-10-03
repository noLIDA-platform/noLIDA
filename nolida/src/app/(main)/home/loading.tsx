import { PageLoader } from "@/components/ui/PageLoader/PageLoader";

/** `/home` — a closer loading boundary than the `(main)` group one. */
export default function Loading() {
  return <PageLoader label="Loading your feed" />;
}