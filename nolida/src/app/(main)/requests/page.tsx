import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestCard } from "@/components/requests/RequestCard/RequestCard";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import {
  listMyRequests,
  listRequests,
} from "@/lib/server/services/request.service";
import "./requests.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requests",
  description: "Open requests on NOlida and the ones you have posted.",
};

/** Two tabs, both plain links — navigation survives a refresh and is shareable. */
const TABS = [
  { key: "open", label: "Open" },
  { key: "mine", label: "Mine" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function parseTab(value: string | string[] | undefined): TabKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "mine" ? "mine" : "open";
}

/**
 * The open feed, or everything the signed-in person has asked for.
 *
 * Same session pattern as the detail page: read the user once, redirect the
 * anonymous visitor, and let the service decide what the viewer may see.
 */
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const params = await searchParams;
  const tab = parseTab(params.tab);

  const result =
    tab === "mine"
      ? await listMyRequests({
          userId: session.user.id,
          limit: FEED_PAGE_SIZE,
        })
      : await listRequests({ limit: FEED_PAGE_SIZE });

  const empty =
    tab === "mine"
      ? {
          title: "You haven't posted any requests yet",
          description:
            "Ask for something and businesses on NOlida will send you offers.",
        }
      : {
          title: "No open requests right now",
          description: "When someone posts a request, it appears here.",
        };

  return (
    <div className="requests-page">
      <div className="requests-head">
        <header className="requests-page__head">
          <h1 className="requests-page__title">Requests</h1>
        </header>

        <Button as="link" href="/requests/new" size="sm">
          Post a request
        </Button>
      </div>

      <nav className="requests-tabs" aria-label="Request lists">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Link
              key={item.key}
              href={item.key === "open" ? "/requests?tab=open" : "/requests?tab=mine"}
              className={`requests-tabs__link${active ? " requests-tabs__link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {result.requests.length === 0 ? (
        <EmptyState
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          }
          title={empty.title}
          description={empty.description}
          action={
            <Button as="link" href="/requests/new" size="sm">
              Post a request
            </Button>
          }
        />
      ) : (
        <ul className="requests-list">
          {result.requests.map((request) => (
            <li key={request.id}>
              <RequestCard request={request} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
