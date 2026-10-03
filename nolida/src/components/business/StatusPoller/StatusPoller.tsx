"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";

export interface StatusPollerProps {
  businessId: string;
  /** False for any status where waiting makes no sense — the poller is inert. */
  enabled: boolean;
  /** What the server rendered, so the first poll has something to compare to. */
  initialStatus: string;
}

const POLL_INTERVAL_MS = 15_000;

/**
 * Watches a pending business for an approval decision (Phase 8B).
 *
 * Review is a human action on another surface: the owner can sit on
 * `/my-business/pending` for hours and nothing would tell them the admin had
 * approved. So this polls the status endpoint every 15 seconds and calls
 * `router.refresh()` the moment the status moves.
 *
 * `router.refresh()` rather than a client-side `router.push()` on purpose: the
 * page is a Server Component, and it is *that* page which owns the redirect
 * rule. Refreshing re-runs it, and an APPROVED business redirects to
 * `/my-business` server-side. This component never decides where to go — it
 * only notices that "something changed".
 *
 * Renders nothing, so the pending page's markup is unaffected by it existing.
 */
export function StatusPoller({
  businessId,
  enabled,
  initialStatus,
}: StatusPollerProps): null {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async (): Promise<void> => {
      const result = await apiFetch<{ status: string }>(
        `/api/businesses/${businessId}/status`,
      );

      if (cancelled) return;
      // A failed poll (offline, signed out) leaves the page as it is. Silence
      // here is correct: the pending screen is still accurate, and the next
      // tick will catch up.
      if (result.ok && result.data.status !== initialStatus) {
        router.refresh();
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [businessId, enabled, initialStatus, router]);

  return null;
}