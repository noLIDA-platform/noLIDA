import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getSubmissionStatus } from "@/lib/server/services/business.service";
import { StatusPoller } from "@/components/business/StatusPoller/StatusPoller";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton/WhatsAppButton";

export const metadata: Metadata = { title: "Business review" };

/**
 * `/my-business/pending` — the status screen, and a redirect in disguise.
 *
 * ## This page is a router first and a screen second (Phase 8B)
 *
 * Approval is decided elsewhere, asynchronously: an admin approves the
 * listing, and the owner is sitting here. Landing on this URL after that
 * happened — or refreshing minutes after approving, or being the last user to
 * return to it — must not show a stale "under review" screen over an approved
 * business. So the status is resolved *before* anything renders:
 *
 * - APPROVED → `/my-business` (the dashboard now exists for this business)
 * - DRAFT / CHANGES_REQUESTED → `/my-business/submit` (the work is the
 *   owner's, and the submission form is where it gets done)
 * - PENDING_REVIEW / REJECTED / SUSPENDED → render the status screen
 *
 * The redirect lives here rather than in the client so it is unconditional:
 * no stale render, no race, no "approve then reload" gap.
 *
 * ## The poller
 *
 * The remaining case is the honest one: genuinely waiting. `StatusPoller`
 * re-checks every 15s and calls `router.refresh()`, which re-runs *this*
 * component — and the branch above then fires. The redirect rule stays in one
 * place instead of being duplicated as a client-side `push`.
 */
export default async function MyBusinessPendingPage() {
  const session = await getCurrentSessionUser();
  if (!session) {
    redirect("/");
  }

  const status = await getSubmissionStatus(session.user.id);
  const business = status?.business ?? null;
  const submission = status?.submission ?? null;

  const businessStatus = business?.status ?? null;
  if (businessStatus === "APPROVED") redirect("/my-business");
  if (businessStatus === "DRAFT" || businessStatus === "CHANGES_REQUESTED") {
    redirect("/my-business/submit");
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 80px" }}>
      {business ? (
        <StatusPoller
          businessId={business.id}
          initialStatus={business.status}
          enabled={business.status === "PENDING_REVIEW"}
        />
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6366F1", fontWeight: 700 }}>
          Submission status
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 3vw, 3rem)" }}>
          {businessStatus === "REJECTED" || businessStatus === "SUSPENDED"
            ? "Your listing needs attention"
            : "Your listing is under review"}
        </h1>
      </div>

      <section style={{ marginTop: 24, padding: 24, borderRadius: 20, border: "1px solid rgba(99, 102, 241, 0.2)", background: "rgba(255,255,255,0.75)" }}>
        <p style={{ margin: "0 0 18px", fontSize: 18 }}>
          <strong>Status:</strong> {business?.status ?? "DRAFT"}
        </p>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
          {submission
            ? `Submission received on ${new Date(submission.submitted_at).toLocaleString()}. Our team will review the listing and update the status here.`
            : "Your business has not been submitted yet. Complete the details and send the listing for review."}
        </p>
        {businessStatus === "PENDING_REVIEW" ? (
          <p style={{ margin: "14px 0 0", color: "#475569", fontSize: 14 }}>
            This page checks for an approval decision every 15 seconds and
            takes you to your dashboard automatically.
          </p>
        ) : null}
        {business?.status === "REJECTED" ? (
          <WhatsAppButton
            label="Get help with your rejected business submission on WhatsApp"
            message="Hi NOlida, I need help with my rejected business submission."
          />
        ) : (
          <WhatsAppButton
            label="Get help with your business submission on WhatsApp"
            message="Hi NOlida, I need help with my business submission."
          />
        )}
      </section>
    </main>
  );
}
