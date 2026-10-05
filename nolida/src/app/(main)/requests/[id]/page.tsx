import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Inbox, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Icon } from "@/components/ui/Icon/Icon";
import { RequestCard } from "@/components/requests/RequestCard/RequestCard";
import { RequestOwnerActions } from "@/components/requests/RequestOwnerActions/RequestOwnerActions";
import { ResponseCard } from "@/components/requests/ResponseCard/ResponseCard";
import { ResponseForm } from "@/components/requests/ResponseForm/ResponseForm";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import {
  getRequest,
  listResponses,
} from "@/lib/server/services/request.service";
import { ACCEPTING_STATUSES } from "@/lib/requests/constants";
import { formatResponseCount } from "@/lib/requests/types";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import "../requests.css";

export const metadata: Metadata = {
  title: "Request",
  description: "A request on NOlida and the offers sent against it.",
};

/**
 * `/requests/[id]` — one request, its offers, and whatever you can do about them.
 *
 * A Server Component. The decisions that decide what is rendered — is this mine,
 * may I respond, have I already — all come back from the service, so this page
 * never re-derives a rule that exists somewhere else.
 *
 * The two audiences see deliberately different things:
 *
 * - the OWNER sees every offer, and can accept one. That is the whole point of
 *   posting a request.
 * - a VISITOR sees the count and their own offer, never the others. A competing
 *   business reading its rivals' prices is the one thing this marketplace must
 *   not expose, so `listResponses` filters it in SQL rather than in the page.
 */
export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const { id } = await params;

  const data = await getRequest({ requestId: id, viewerId: session.user.id });
  if (!data) notFound();

  const responses = await listResponses({
    requestId: data.request.id,
    viewerId: session.user.id,
    limit: FEED_PAGE_SIZE,
  });

  const canAct = ACCEPTING_STATUSES.includes(data.request.status);

  return (
    <div className="requests-page">
      <Link href="/requests" className="requests-back">
        <Icon as={ArrowLeft} size={16} />
        <span>Back to requests</span>
      </Link>

      <RequestCard request={data.request} variant="full" />

      {data.isOwn ? (
        <RequestOwnerActions requestId={data.request.id} canAct={canAct} />
      ) : null}

      <section className="requests-detail__section">
        <h2 className="requests-detail__section-title">
          {formatResponseCount(responses?.count ?? 0)}
        </h2>

        {data.isOwn ? (
          responses && responses.responses.length > 0 ? (
            <ul className="requests-list">
              {responses.responses.map((response) => (
                <li key={response.id}>
                  <ResponseCard response={response} isOwner />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Icon as={Inbox} size={28} />}
              title="No offers yet"
              description="When a business responds, their offer appears here with a price."
            />
          )
        ) : null}

        {/* The visitor's own offer is the only one they ever see, so it doubles
            as the withdraw control. */}
        {!data.isOwn && responses && responses.responses.length > 0 ? (
          <ul className="requests-list">
            {responses.responses.map((response) => (
              <li key={response.id}>
                <ResponseCard response={response} isOwner={false} isMine />
              </li>
            ))}
          </ul>
        ) : null}

        {!data.isOwn && data.canRespond ? (
          <ResponseForm
            requestId={data.request.id}
            hasApprovedBusiness
            businessName={data.business?.name ?? null}
          />
        ) : null}

        {!data.isOwn && !data.canRespond && data.hasResponded ? (
          <p className="requests-detail__note">
            Your offer has been sent. You can withdraw it above while it is still
            awaiting a decision.
          </p>
        ) : null}

        {!data.isOwn && !data.canRespond && !data.hasResponded ? (
          canAct ? (
            <p className="requests-detail__note">
              {formatResponseCount(responses?.count ?? 0)} so far. Only
              businesses with an approved profile can send offers.
            </p>
          ) : (
            <p className="requests-detail__note">
              This request is closed and is no longer accepting offers.
            </p>
          )
        ) : null}

        {/* Shown to the owner only when the request is settled, so they can see
            where it ended up after leaving the page. */}
        {data.isOwn && !canAct ? (
          <p className="requests-detail__note">
            <Icon as={MessageSquare} size={14} />
            {" "}
            This request is closed. Accepted and declined offers stay here as a
            record.
          </p>
        ) : null}
      </section>
    </div>
  );
}