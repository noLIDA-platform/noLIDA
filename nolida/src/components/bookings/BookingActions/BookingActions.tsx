"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { apiFetch } from "@/lib/client/api";
import type { BookingStatus } from "@/lib/bookings/constants";
import "./BookingActions.css";

export interface BookingActionsProps {
  bookingId: string;
  status: BookingStatus;
  isCustomer: boolean;
  isBusinessOwner: boolean;
  scheduledAt: string | null;
}

export function BookingActions({
  bookingId,
  status,
  isCustomer,
  isBusinessOwner,
  scheduledAt,
}: BookingActionsProps): React.JSX.Element | null {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState("");

  const isTerminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status);
  const isReschedulable = ["PENDING", "CONFIRMED", "RESCHEDULED"].includes(status);

  const handleAction = async (
    action: string,
    path: string,
    body?: unknown
  ) => {
    setError(null);
    setSubmitting(action);
    const result = await apiFetch(path, {
      method: "POST",
      body: body ?? undefined,
    });
    if (!result.ok) {
      setError(result.error.message);
    } else {
      router.refresh();
    }
    setSubmitting(null);
  };

  const handleConfirm = () =>
    handleAction("confirm", `/api/bookings/${bookingId}/confirm`);
  const handleComplete = () =>
    handleAction("complete", `/api/bookings/${bookingId}/complete`);
  const handleCancel = () =>
    handleAction("cancel", `/api/bookings/${bookingId}/cancel`);
  const handleNoShow = () =>
    handleAction("no-show", `/api/bookings/${bookingId}/no-show`);
  const handleReschedule = () => {
    setError(null);
    setSubmitting("reschedule");
    apiFetch(`/api/bookings/${bookingId}/reschedule`, {
      method: "POST",
      body: { scheduledAt: new Date(newScheduledAt).toISOString() },
    }).then((result) => {
      setSubmitting(null);
      setIsRescheduleOpen(false);
      if (!result.ok) {
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  };

  if (isTerminal) return null;

  return (
    <div className="booking-actions">
      {error && <p className="booking-actions__error">{error}</p>}

      {/* Business-owner actions */}
      {isBusinessOwner && status === "PENDING" && (
        <Button
          variant="primary"
          size="sm"
          loading={submitting === "confirm"}
          disabled={!!submitting}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      )}

      {isBusinessOwner && (status === "CONFIRMED" || status === "RESCHEDULED") && (
        <>
          <Button
            variant="primary"
            size="sm"
            loading={submitting === "complete"}
            disabled={!!submitting}
            onClick={handleComplete}
          >
            Mark complete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={submitting === "no-show"}
            disabled={!!submitting}
            onClick={handleNoShow}
          >
            Mark no-show
          </Button>
        </>
      )}

      {/* Shared: cancel and reschedule */}
      {isReschedulable && (
        <>
          {isCustomer && (
            <Button
              variant="secondary"
              size="sm"
              loading={submitting === "cancel"}
              disabled={!!submitting}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
          {isBusinessOwner && (
            <Button
              variant="secondary"
              size="sm"
              loading={submitting === "cancel"}
              disabled={!!submitting}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            loading={submitting === "reschedule"}
            disabled={!!submitting || !!isRescheduleOpen}
            onClick={() => {
              setNewScheduledAt(
                scheduledAt ? toLocalInput(new Date(scheduledAt)) : ""
              );
              setIsRescheduleOpen(true);
            }}
          >
            Reschedule
          </Button>
        </>
      )}

      {/* Reschedule inline form */}
      {isRescheduleOpen && isReschedulable && (
        <div className="booking-actions__reschedule-form">
          <input
            type="datetime-local"
            value={newScheduledAt}
            onChange={(e) => setNewScheduledAt(e.target.value)}
            className="booking-actions__input"
            aria-label="New scheduled time"
            required
          />
          <Button
            variant="primary"
            size="sm"
            loading={submitting === "reschedule"}
            onClick={handleReschedule}
            disabled={!newScheduledAt}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setIsRescheduleOpen(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
