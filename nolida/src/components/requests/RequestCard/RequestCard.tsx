import Link from "next/link";
import { CalendarDays, MapPin, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Badge, type BadgeVariant } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { Icon } from "@/components/ui/Icon/Icon";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_URGENCY_LABELS,
  formatDeadline,
  type RequestStatus,
  type RequestUrgency,
} from "@/lib/requests/constants";
import {
  formatBudgetRange,
  formatResponseCount,
  type RequestView,
} from "@/lib/requests/types";
import { formatTimeAgo } from "@/utils/time";
import "./RequestCard.css";

export type RequestCardVariant = "full" | "compact";

export interface RequestCardProps {
  request: RequestView;
  /** `compact` is the grid tile; `full` is the detail page. */
  variant?: RequestCardVariant;
  className?: string;
}

/** URGENT is the only urgency that earns colour — everything else is noise. */
function urgencyVariant(urgency: RequestUrgency): BadgeVariant {
  if (urgency === "URGENT") return "error";
  if (urgency === "FLEXIBLE") return "default";
  return "warning";
}

/**
 * Status colour, chosen so the three that mean "you can still act" read apart
 * from the three that mean "this is history".
 */
function statusVariant(status: RequestStatus): BadgeVariant {
  if (status === "OPEN") return "success";
  if (status === "IN_PROGRESS") return "brand";
  if (status === "FULFILLED") return "warning";
  return "default";
}

/**
 * One request.
 *
 * A Server Component. The whole list is plain HTML; there is nothing here that
 * needs to know about interactivity, and the interactive parts of a request —
 * accepting an offer, closing it — live on the detail page where there is room
 * for them to be deliberate.
 *
 * The card is a link, not a button with a nested link. Nesting an anchor inside
 * an interactive control is invalid and makes "open this" and "respond to this"
 * two different destinations fighting over one tap target.
 */
export function RequestCard({
  request,
  variant = "full",
  className,
}: RequestCardProps): React.JSX.Element {
  const compact = variant === "compact";
  const authorName =
    request.author.display_name ??
    request.author.full_name ??
    request.author.username ??
    "Someone";
  const budget = formatBudgetRange(
    request.budget_min,
    request.budget_max,
    request.currency
  );

  return (
    <Card
      as="article"
      className={[
        "request-card",
        `request-card--${variant}`,
        // An accepted or finished request is history, and should look like it
        // without being greyed out to the point of unreadable.
        request.status === "OPEN" ? "request-card--open" : "request-card--settled",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="request-card__head">
        <Avatar src={request.author.avatar_url} name={authorName} size="sm" />
        <div className="request-card__identity">
          <span className="request-card__author">{authorName}</span>
          <span className="request-card__meta">
            {request.author.username ? (
              <span>@{request.author.username}</span>
            ) : null}
            {request.author.username ? (
              <span aria-hidden="true"> · </span>
            ) : null}
            <time dateTime={request.created_at}>
              {formatTimeAgo(request.created_at)}
            </time>
          </span>
        </div>
        <Badge variant={urgencyVariant(request.urgency)}>
          {REQUEST_URGENCY_LABELS[request.urgency]}
        </Badge>
      </header>

      <Link href={`/requests/${request.id}`} className="request-card__link">
        <h3 className="request-card__title">{request.title}</h3>

        {!compact ? (
          <p className="request-card__description">{request.description}</p>
        ) : null}

        {!compact ? (
          <ul className="request-card__facts">
            {request.location ? (
              <li className="request-card__fact">
                <Icon as={MapPin} size={14} />
                {request.location}
              </li>
            ) : null}
            {request.deadline ? (
              <li className="request-card__fact">
                <Icon as={CalendarDays} size={14} />
                By {formatDeadline(request.deadline)}
              </li>
            ) : null}
            <li className="request-card__fact">
              <Icon as={Wallet} size={14} />
              {/* No budget stated is a real answer — "budget flexible" is what
                  people say when they are negotiating — so it gets a sentence
                  rather than an empty slot. */}
              {budget ?? "Budget flexible"}
            </li>
          </ul>
        ) : null}

        <footer className="request-card__foot">
          <span className="request-card__responses">
            {formatResponseCount(request.response_count)}
          </span>
          {request.category_name ? (
            <Badge variant="default">{request.category_name}</Badge>
          ) : null}
          <Badge variant={statusVariant(request.status)}>
            {REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </footer>
      </Link>
    </Card>
  );
}