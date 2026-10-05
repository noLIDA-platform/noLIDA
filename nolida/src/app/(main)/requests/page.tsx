import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { RequestCard } from "@/components/requests/RequestCard/RequestCard";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import {
  listMyRequests,
  listRequests,
} from "@/lib/server/services/request.service";
import * as categoriesRepo from "@/lib/server/repositories/categories.repo";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import {
  REQUEST_URGENCIES,
  REQUEST_URGENCY_LABELS,
  type RequestUrgency,
} from "@/lib/requests/constants";
import "./requests.css";

export const metadata: Metadata = {
  title: "Requests",
  description: "Open requests on NOlida, and the ones you have posted.",
};

/** Both tabs, as plain links. No client state, no hydration. */
const TABS = [
  { key: "open", label: "Open requests" },
  { key: "mine", label: "My requests" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Anything unexpected falls back to "open" rather than rendering nothing, so a
 * stale or hand-edited `?tab=` lands somewhere real.
 */
function parseTab(value: string | string[] | undefined): TabKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "mine" ? "mine" : "open";
}

/**
 * `/requests` — the marketplace's main list.
 *
 * Two tabs sharing one page. "Open" is what businesses browse; "mine" is the
 * viewer's own history including closed and cancelled requests, because a
 * request that vanished the moment it closed would be useless for remembering
 * what you asked for.
 *
 * The filters are a plain GET form rather than client state, so a filtered
 * result set has a URL that can be shared and reloaded.
 */
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    category?: string;
    location?: string;
    urgency?: string;
  }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const params = await searchParams;
  const tab = parseTab(params.tab);
  const category = typeof params.category === "string" ? params.category : "";
  const location = typeof params.location === "string" ? params.location : "";
  const urgency = (REQUEST_URGENCIES as readonly string[]).includes(
    params.urgency ?? ""
  )
    ? (params.urgency as RequestUrgency)
    : null;

  const categories = await categoriesRepo.listAll({ activeOnly: true });

  const result =
    tab === "mine"
      ? await listMyRequests({ userId: session.user.id, limit: FEED_PAGE_SIZE })
      : await listRequests({
          limit: FEED_PAGE_SIZE,
          categoryId: category || null,
          location: location || null,
          urgency,
        });

  /** Preserves the other filters when a tab or urgency link is tapped. */
  const buildHref = (patch: Record<string, string | null>): string => {
    const next = new URLSearchParams();
    const merged: Record<string, string | null> = {
      tab,
      category: category || null,
      location: location || null,
      urgency,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/requests?${query}` : "/requests";
  };

  return (
    <div className="requests-page">
      <div className="requests-head">
        <header className="requests-page__head">
          <h1 className="requests-page__title">Requests</h1>
          <p className="requests-page__subtitle">
            {tab === "mine"
              ? "Everything you have asked for."
              : "What people on NOlida need right now."}
          </p>
        </header>

        <Button size="md" variant="primary" as="link" href="/requests/new">
          <Plus size={16} />
          <span>Post a request</span>
        </Button>
      </div>

      <nav className="requests-tabs" aria-label="Request lists">
        {TABS.map((entry) => (
          <Link
            key={entry.key}
            href={buildHref({ tab: entry.key })}
            className={[
              "requests-tabs__link",
              entry.key === tab ? "requests-tabs__link--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={entry.key === tab ? "page" : undefined}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {/* Filters only exist for the open feed — your own history is not a
          catalog, and filtering your own history by urgency is not a thing
          anybody does. */}
      {tab === "open" ? (
        <>
          <form className="requests-filters" method="get" action="/requests">
            <input type="hidden" name="tab" value="open" />
            <select
              name="category"
              className="requests-filters__select"
              defaultValue={category}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <input
              type="search"
              name="location"
              className="requests-filters__select"
              defaultValue={location}
              placeholder="Location"
              aria-label="Filter by location"
            />
            <Button size="sm" variant="secondary" type="submit">
              Filter
            </Button>
          </form>

          <div className="requests-filters">
            {REQUEST_URGENCIES.map((option) => (
              <Link
                key={option}
                href={buildHref({ urgency: urgency === option ? null : option })}
                className={[
                  "requests-filters__select",
                  urgency === option
                    ? "requests-filters__select--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={urgency === option}
              >
                {REQUEST_URGENCY_LABELS[option]}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {result.requests.length === 0 ? (
        <EmptyState
          icon={<Icon as={Plus} size={28} />}
          title={
            tab === "mine"
              ? "You haven't posted any requests yet"
              : "No open requests right now"
          }
          description={
            tab === "mine"
              ? "Ask for something and businesses nearby will send you offers."
              : "Nothing matches these filters. Widen them, or post the first request yourself."
          }
          action={
            <Button size="sm" variant="primary" as="link" href="/requests/new">
              Post a request
            </Button>
          }
        />
      ) : (
        <ul className="requests-list">
          {result.requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} variant="full" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}