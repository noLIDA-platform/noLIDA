import type { Metadata } from "next";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { VerifyForm } from "@/components/auth/VerifyForm/VerifyForm";

export const metadata: Metadata = {
  title: "Verify your account",
  description: "Enter the verification code we sent you to activate noLIDA.",
};

/**
 * Account verification. The identifier and the OTP purpose arrive on the query
 * string (`/verify?identifier=…&purpose=REGISTER|RESET`) from /signup or
 * /forgot-password; `VerifyForm` reads them itself and renders a "link is
 * missing its details" state when they are absent.
 */
export default function VerifyPage() {
  return (
    <AuthSplitShell
      orientation="form-right"
      beneathStack={
        <HeroBlock
          eyebrow="Almost there"
          title="One code and you're in."
          subtitle="Verifying your email or phone keeps your account and your payments safe."
          primaryCta={{ label: "Why verify?", href: "/help" }}
          size="md"
        />
      }
    >
      <VerifyForm headingLevel="h2" />
    </AuthSplitShell>
  );
}
