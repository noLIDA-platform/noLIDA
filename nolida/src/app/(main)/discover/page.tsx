import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DiscoverExplorer } from "@/components/discover/DiscoverExplorer/DiscoverExplorer";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { listFeatured } from "@/lib/server/services/publicBusiness.service";
import "./discover.css";

export const metadata: Metadata = {
  title: "Discover",
  description: "Search posts, people and businesses, or browse what is trending.",
};

/**
 * `/discover` — search, and something to look at before you search.
 *
 * A Server Component on purpose. The page reads the session and `?q=` and hands
 * both to the client island below. That is what makes the desktop top bar's
 * plain GET form work end to end: submitting it navigates to `/discover?q=…`,
 * and this page turns that query into real results on the first render rather
 * than after a hydration round-trip.
 *
 * Since Phase 8B the page also fetches featured businesses here, on the
 * server, and passes them down — the first discovery section a visitor sees
 * (Phase 8B). Both reads run together so one round trip feeds the whole
 * resting state of the page.
 *
 * The session is re-read here even though `(main)/layout.tsx` already refused
 * anyone without one — the viewer's id is needed by every follow button, and a
 * page that renders someone's identity must not rely on a parent having done
 * its job.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const params = await searchParams;
  // A repeated `?q=a&q=b` is not a search; take the first and move on.
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const initialQuery = typeof raw === "string" ? raw : "";

  const featuredBusinesses = await listFeatured({ limit: 6 });

  return (
    <div className="discover-page">
      {/* Keyed by the query so submitting the top bar form while already on
          /discover re-runs the search instead of leaving stale results. */}
      <DiscoverExplorer
        key={initialQuery}
        viewerId={session.user.id}
        initialQuery={initialQuery}
        featuredBusinesses={featuredBusinesses}
      />
    </div>
  );
}