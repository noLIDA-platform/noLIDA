import type { Metadata } from "next";
import { RedeemCodeForm } from "@/components/business/RedeemCodeForm";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton/WhatsAppButton";

export const metadata: Metadata = { title: "List your business" };

export default function ListYourBusinessPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>
        <p style={{ margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6366F1", fontWeight: 700 }}>
          List your business
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 4vw, 4rem)", lineHeight: 1.1 }}>
          Start your listing in a few steps.
        </h1>
        <p style={{ margin: 0, color: "#475569", fontSize: 18, lineHeight: 1.7 }}>
          Use the business code you received from noLIDA to create your listing. Then add your business profile and submit it for review.
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <WhatsAppButton
            label="Ask how to list your business on WhatsApp"
            message="Hi noLIDA, I want to list my business on noLIDA."
          />
          <span>Need a business code? Message us.</span>
        </div>
      </div>

      <section style={{ marginTop: 36, padding: 24, borderRadius: 20, border: "1px solid rgba(99, 102, 241, 0.2)", background: "rgba(255,255,255,0.75)" }}>
        <RedeemCodeForm />
      </section>
    </main>
  );
}