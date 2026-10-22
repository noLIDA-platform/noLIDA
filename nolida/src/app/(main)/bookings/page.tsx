import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { Badge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { CheckIcon } from "@/components/ui/Icons";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { listBookingsForCustomer } from "@/lib/server/services/booking.service";
import { formatBookingPrice } from "@/lib/bookings/types";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import "./bookings.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My bookings",
  description: "Bookings you have made on NOLIda.",
};

const PAGE_SIZE = 20;

function statusVariant(status: string) {
  switch (status) {
    case "PENDING": return "default";
    case "CONFIRMED": return "success";
    case "COMPLETED": return "success";
    case "CANCELLED": return "error";
    default: return "default";
  }
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const params = await searchParams;
  const cursor = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;

  const page = await listBookingsForCustomer({
    userId: session.user.id,
    limit: PAGE_SIZE,
    cursor: cursor ?? null,
  });

  const empty = {
    title: "No bookings yet",
    description:
      "When a business accepts your request, book it here and the job moves from offer to confirmed work.",
    action: (
      <Link href="/requests?tab=mine">
        <Button size="sm">View my requests</Button>
      </Link>
    ),
  };

  return (
    <div className="bookings-page">
      <header className="bookings-page__head">
        <h1 className="bookings-page__title">My bookings</h1>
      </header>

      {page.rows.length === 0 ? (
        <EmptyState
          icon={<Icon as={CheckIcon} size={26} />}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      ) : (
        <>
          <ul className="bookings-list">
            {page.rows.map((booking) => (
              <li key={booking.id} className="bookings-list__item">
                <article className="booking-card">
                  <div className="booking-card__main">
                    <h2 className="booking-card__business">
                      {booking.business_name ?? "Business"}
                    </h2>
                    <p className="booking-card__price">
                      {formatBookingPrice(booking.price_minor, booking.currency)}
                    </p>
                    <Badge variant={statusVariant(booking.status)}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </Badge>
                  </div>
                  <div className="booking-card__meta">
                    <time className="booking-card__time">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </time>
                    {booking.scheduled_at && (
                      <span className="booking-card__scheduled">
                        Scheduled{" "}
                        {new Date(booking.scheduled_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="booking-card__link"
                  >
                    View details
                  </Link>
                </article>
              </li>
            ))}
          </ul>

          {page.nextCursor ? (
            <div className="bookings-load-more">
              <Link
                href={`/bookings?cursor=${encodeURIComponent(page.nextCursor)}`}
              >
                <Button size="sm">Load more</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

