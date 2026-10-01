import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { BusinessSubmissionForm } from "@/components/business/BusinessSubmissionForm";

export const metadata: Metadata = { title: "Submit business" };

export default async function MyBusinessSubmitPage() {
  const session = await getCurrentSessionUser();
  if (!session) {
    redirect("/");
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
        <p style={{ margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6366F1", fontWeight: 700 }}>
          Business profile
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 3vw, 3rem)" }}>Add your business details</h1>
      </div>

      <section style={{ padding: 24, borderRadius: 20, border: "1px solid rgba(99, 102, 241, 0.2)", background: "rgba(255,255,255,0.75)" }}>
        <BusinessSubmissionForm />
      </section>
    </main>
  );
}
