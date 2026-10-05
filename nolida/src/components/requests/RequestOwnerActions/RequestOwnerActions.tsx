"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { apiFetch } from "@/lib/client/api";
import "./RequestOwnerActions.css";

export interface RequestOwnerActionsProps {
  requestId: string;
  /** False for a request that is already closed — nothing to act on. */
  canAct: boolean;
}

/**
 * Close, cancel or mark fulfilled — the owner's three ways to end a request.
 *
 * Rendered disabled rather than hidden once the request is closed, with a line
 * explaining why. A row of buttons that disappears is a row somebody will keep
 * looking for.
 *
 * A refresh rather than local state afterwards, for the same reason the accept
 * button does it: closing stamps a status and a timestamp that only the server
 * knows, and the page shows that status in three places.
 */
export function RequestOwnerActions({
  requestId,
  canAct,
}: RequestOwnerActionsProps): React.JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = async (status: string): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await apiFetch(`/api/requests/${requestId}/close`, {
      method: "POST",
      body: { status },
    });

    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
      return;
    }
    router.refresh();
  };

  if (!canAct) {
    return (
      <p className="request-owner-actions__closed">
        This request is closed and is no longer accepting offers.
      </p>
    );
  }

  return (
    <div className="request-owner-actions">
      <div className="request-owner-actions__buttons">
        <Button
          size="sm"
          variant="primary"
          disabled={busy}
          onClick={() => void close("FULFILLED")}
        >
          Mark as done
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void close("CLOSED")}
        >
          Close
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void close("CANCELLED")}
        >
          Cancel request
        </Button>
      </div>

      {error ? (
        <p className="request-owner-actions__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}