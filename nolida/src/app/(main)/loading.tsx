import { PageLoader } from "@/components/ui/PageLoader/PageLoader";

/**
 * Loading boundary for every signed-in route (Phase 8F).
 *
 * `(main)` is the group root, so this is the *fallback* boundary: it covers any
 * route under it that does not declare a nearer `loading.tsx`. The routes that
 * do (home, discover, messages, profile, my-business) get a closer boundary and
 * therefore skip this one — which is the point of having both.
 *
 * Every `(main)` page is `force-dynamic`, so this is not a nicety: without it
 * the shell would hold the previous screen for the whole server round trip and
 * a bottom-nav tap would look inert.
 */
export default function Loading() {
  return <PageLoader />;
}