import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge/Badge";
import { Icon } from "@/components/ui/Icon/Icon";
import { ChevronLeftIcon } from "@/components/ui/Icons";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import {
  getBookingForViewer,
  isBusinessOwner,
} from "@/lib/server/services/booking.service";
import { formatBookingPrice } from "@/lib/bookings/types";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_HINTS,
  type BookingStatus,
} from "@/lib/bookings/constants";
import { BookingActions } from "@/components/bookings/BookingActions/BookingActions";
import "../bookings.css";
import "./detail.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking details",
  description: "View and manage a booking on NOLIda.",
};

const STATUS_VARIANT: Record<
  BookingStatus,
  "default" | "success" | "warning" | "error" | "brand"
> = {
  PENDING: "default",
  CONFIRMED: "success",
  RESCHEDULED: "warning",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "error",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const { id } = await params;
  const booking = await getBookingForViewer(session.user.id, id);
  if (!booking) redirect("/bookings");

  const isCustomer = booking.customer_id === session.user.id;
  const viewerIsOwner = await isBusinessOwner(
    session.user.id,
    booking.business_id
  );

  const statusLabel =
    BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? booking.status;
  const statusHint =
    BOOKING_STATUS_HINTS[booking.status as BookingStatus] ?? "";

  return (
    <div className="booking-detail">
      <header className="booking-detail__head">
        <Link href="/bookings" className="booking-detail__back">
          <Icon as={ChevronLeftIcon} size={20} />
          Back to bookings
        </Link>
      </header>

      <main className="booking-detail__main">
        <section className="booking-detail__card">
          <div className="booking-detail__header">
            <h1 className="booking-detail__business">
              {booking.business_name ?? "Business"}
            </h1>
            <Badge variant={STATUS_VARIANT[booking.status]}>
              {statusLabel}
            </Badge>
          </div>

          {statusHint && (
            <p className="booking-detail__hint">{statusHint}</p>
          )}

          <dl className="booking-detail__grid">
            <div className="booking-detail__item">
              <dt className="booking-detail__label">Price</dt>
              <dd className="booking-detail__value">
                {formatBookingPrice(booking.price_minor, booking.currency)}
              </dd>
            </div>

            {booking.scheduled_at && (
              <div className="booking-detail__item">
                <dt className="booking-detail__label">Scheduled</dt>
                <dd className="booking-detail__value">
                  {formatDateTime(booking.scheduled_at)}
                </dd>
              </div>
            )}

            <div className="booking-detail__item">
              <dt className="booking-detail__label">Customer</dt>
              <dd className="booking-detail__value">
                {isCustomer ? "You" : "Customer"}
              </dd>
            </div>

            {booking.business_id && (
              <div className="booking-detail__item">
                <dt className="booking-detail__label">Business</dt>
                <dd className="booking-detail__value">
                  {viewerIsOwner ? "You" : booking.business_name ?? "Business"}
                </dd>
              </div>
            )}

            <div className="booking-detail__item">
              <dt className="booking-detail__label">Created</dt>
              <dd className="booking-detail__value">
                {formatDate(booking.created_at)}
              </dd>
            </div>

            {booking.notes && (
              <div className="booking-detail__item booking-detail__notes-item">
                <dt className="booking-detail__label">Notes</dt>
                <dd className="booking-detail__value booking-detail__notes">
                  {booking.notes}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <aside className="booking-detail__actions">
          <BookingActions
            bookingId={booking.id}
            status={booking.status}
            isCustomer={isCustomer}
            isBusinessOwner={viewerIsOwner}
            scheduledAt={booking.scheduled_at}
          />
        </aside>
      </main>
    </div>
  );
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-NG", {
    dateStyle: "medium",
  });
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });
}