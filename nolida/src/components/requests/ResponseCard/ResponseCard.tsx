"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { apiFetch } from "@/lib/client/api";
import {
  RESPONSE_STATUS_LABELS,
  formatMoney,
} from "@/lib/requests/constants";
import { readAttachmentUrls, type ResponseView } from "@/lib/requests/types";
import { formatTimeAgo } from "@/utils/time";
import "./ResponseCard.css";

export interface ResponseCardProps {
  response: ResponseView;
  /** The viewer owns the REQUEST, so they can accept. */
  isOwner: boolean;
  /** The viewer sent this offer, so they can withdraw it. */
  isMine?: boolean;
  /** Escape hatch for a caller that wants to own the refresh itself. */
  onDone?: () => void;
}

/**
 * Colour is doing real work: ACCEPTED is the outcome everybody is looking for,
 * DECLINED should read as finished rather than as an error, and WITHDRAWN should
 * recede.
 */
function statusVariant(status: ResponseView["status"]): BadgeVariant {
  if (status === "ACCEPTED") return "success";
  if (status === "DECLINED") return "error";
  if (status === "WITHDRAWN") return "default";
  return "warning";
}

/**
 * One offer on a request.
 *
 * A Client Component, because accepting an offer is the whole point of this
 * screen and it needs to feel immediate. The request page stays a Server
 * Component; this island is the only part that ships JavaScript.
 *
 * No optimistic update here, deliberately. Accepting flips four things across two
 * tables — this response, every rival response, the request and its status — so
 * painting the new state locally and then discovering the transaction failed
 * would leave the customer looking at a choice they did not make. A refresh is
 * slower and never lies.
 */
export function ResponseCard({
  response,
  isOwner,
  isMine = false,
  onDone,
}: ResponseCardProps): React.JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachments = readAttachmentUrls(response.attachments);
  const businessName = response.business_name ?? "A business";
  const alreadyAccepted = response.status === "ACCEPTED";
  const canAccept = isOwner && !alreadyAccepted && response.status === "PENDING";
  const canWithdraw = isMine && response.status === "PENDING";

  const run = async (
    path: string,
    method: "POST" | "DELETE"
  ): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await apiFetch(path, { method });
    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    if (onDone) onDone();
    else router.refresh();
  };

  return (
    <Card
      as="article"
      className={`response-card response-card--${response.status.toLowerCase()}`}
    >
      <header className="response-card__head">
        <span className="response-card__avatar" aria-hidden="true">
          {businessName.slice(0, 1).toUpperCase()}
        </span>
        <div className="response-card__identity">
          {response.business_slug ? (
            <Link
              href={`/business/${response.business_slug}`}
              className="response-card__business"
            >
              {businessName}
            </Link>
          ) : (
            // No slug means the business has been deleted. The offer still stands
            // as a record, so it renders as text rather than a dead link.
            <span className="response-card__business">{businessName}</span>
          )}
          <span className="response-card__meta">
            <time dateTime={response.created_at}>
              {formatTimeAgo(response.created_at)}
            </time>
          </span>
        </div>
        <Badge variant={statusVariant(response.status)}>
          {RESPONSE_STATUS_LABELS[response.status]}
        </Badge>
      </header>

      <p className="response-card__message">{response.message}</p>

      <div className="response-card__numbers">
        {response.price_estimate != null ? (
          <p className="response-card__price">
            {formatMoney(response.price_estimate, response.currency ?? "NGN")}
          </p>
        ) : (
          // No number given is normal — plenty of work can only be quoted after a
          // look at the job. Saying so beats leaving a blank where a price should
          // be, which reads as a bug.
          <p className="response-card__price response-card__price--none">
            Price on inspection
          </p>
        )}
        {response.availability_note ? (
          <p className="response-card__availability">
            {response.availability_note}
          </p>
        ) : null}
      </div>

      {attachments.length > 0 ? (
        <ul className="response-card__attachments">
          {attachments.map((url) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="response-card__attachment"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="response-card__error" role="alert">
          {error}
        </p>
      ) : null}

      {canAccept || canWithdraw ? (
        <footer className="response-card__actions">
          {canAccept ? (
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() =>
                void run(
                  `/api/requests/${response.request_id}/responses/${response.id}/accept`,
                  "POST"
                )
              }
            >
              Accept this offer
            </Button>
          ) : null}

          {canWithdraw ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(
                  `/api/requests/${response.request_id}/responses/${response.id}`,
                  "DELETE"
                )
              }
            >
              Withdraw offer
            </Button>
          ) : null}
        </footer>
      ) : null}
    </Card>
  );
}