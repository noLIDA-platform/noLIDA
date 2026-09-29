import type { Metadata } from "next";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { SignupForm } from "@/components/auth/SignupForm/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Join noLIDA to discover, request, book, and pay — all in one place.",
};

/**
 * Sign-up. Same split-screen shell as `/`, with reversed copy aimed at new
 * users. The form covers name, email-or-phone, password and terms.
 */
export default function SignupPage() {
  return (
    <AuthSplitShell
      orientation="form-right"
      beneathStack={
        <HeroBlock
          eyebrow="Free to join"
          title="Your customers are already here."
          subtitle="Create an account to discover businesses, request what you need, and pay securely — all in one place."
          primaryCta={{ label: "How it works", href: "/how-it-works" }}
          secondaryCta={{ label: "For business", href: "/for-business" }}
          size="md"
        />
      }
    >
      <SignupForm headingLevel="h2" />
    </AuthSplitShell>
  );
}
