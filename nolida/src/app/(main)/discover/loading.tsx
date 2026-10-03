import { PageLoader } from "@/components/ui/PageLoader/PageLoader";

/** `/discover` — a closer loading boundary than the `(main)` group one. */
export default function Loading() {
  return <PageLoader label="Loading discovery" />;
}