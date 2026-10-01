import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getMyBusiness, getSubmissionStatus } from "@/lib/server/services/business.service";

export const metadata: Metadata = { title: "My business" };

export default async function MyBusinessPage() {
  const session = await getCurrentSessionUser();
  if (!session) {
    redirect("/");
  }

  const business = await getMyBusiness(session.user.id);
  const status = business ? await getSubmissionStatus(session.user.id) : null;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <p style={{ margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6366F1", fontWeight: 700 }}>
          My business
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 3vw, 3rem)" }}>
          {business?.name ?? "Create your business listing"}
        </h1>
      </div>

      <section style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px solid rgba(99, 102, 241, 0.2)", background: "rgba(255,255,255,0.75)" }}>
        {business ? (
          <>
            <p style={{ margin: 0, fontSize: 18 }}>
              <strong>Status:</strong> {business.status}
            </p>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
              {status?.submission
                ? `Most recent submission: ${new Date(status.submission.submitted_at).toLocaleString()}`
                : "No submission has been sent yet."}
            </p>
          </>
        ) : (
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
            You have not redeemed a business code or created a business yet. Start by listing your business and submitting it for review.
          </p>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/list-your-business" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 12, background: "#6366F1", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
            {business ? "Update listing" : "Start listing"}
          </a>
          {business ? (
            <a href="/my-business/submit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(99,102,241,0.3)", color: "#111827", background: "transparent", textDecoration: "none", fontWeight: 700 }}>
              Submit details
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}