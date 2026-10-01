import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getSubmissionStatus } from "@/lib/server/services/business.service";

export const metadata: Metadata = { title: "Business review" };

export default async function MyBusinessPendingPage() {
  const session = await getCurrentSessionUser();
  if (!session) {
    redirect("/");
  }

  const status = await getSubmissionStatus(session.user.id);
  const business = status?.business ?? null;
  const submission = status?.submission ?? null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6366F1", fontWeight: 700 }}>
          Submission status
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 3vw, 3rem)" }}>
          {business?.status === "APPROVED" ? "Your business is approved" : "Your listing is under review"}
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
      </section>
    </main>
  );
}
