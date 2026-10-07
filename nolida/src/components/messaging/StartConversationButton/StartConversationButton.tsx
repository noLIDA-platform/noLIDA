"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { apiFetch } from "@/lib/client/api";

export interface StartConversationButtonProps {
  /** The person (or business owner) to open a thread with. */
  otherUserId: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
  loading?: boolean;
}

/**
 * The "Message" button. One conversation between two people is canonical
 * (user_a < user_b), so tapping this twice — from either profile — lands on
 * the SAME thread; the service returns the existing row.
 *
 * Navigates with a full document load on purpose: `/messages/[id]` is a
 * Server Component that reads the session cookie, and a client-side transition
 * would render it from cache first. Same reason post-auth navigation uses
 * `window.location`.
 */
export function StartConversationButton({
  otherUserId,
  size = "md",
  fullWidth = false,
  className,
  ariaLabel = "Message this person",
  loading: externalLoading,
}: StartConversationButtonProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = externalLoading ?? busy;

  const start = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ conversation: { id: string } }>(
      "/api/conversations",
      { method: "POST", body: { otherUserId } },
    );

    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    // Full load, not router.push: the thread must render on the server with
    // the current session cookie; a client transition could render from cache.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full load; the thread must render server-side with the current session cookie
    window.location.assign(`/messages/${result.data.conversation.id}`);
  };

  return (
    <span className={className} style={{ display: "inline-flex", flexDirection: "column" }}>
      <Button
        size={size}
        variant="secondary"
        loading={loading}
        fullWidth={fullWidth}
        onClick={() => void start()}
        ariaLabel={ariaLabel}
      >
        <Icon as={MessageCircle} size={16} />
        <span>Message</span>
      </Button>
      {error ? (
        <span role="alert" style={{ color: "var(--color-error)", fontSize: "var(--text-xs)" }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
