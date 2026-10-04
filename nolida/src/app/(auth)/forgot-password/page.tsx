import type { Metadata } from "next";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a NOlida password reset link.",
};

/**
 * Password reset request. The copy is deliberately neutral — it never says
 * whether an account exists for the address entered.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthSplitShell
      orientation="form-right"
      beneathStack={
        <HeroBlock
          eyebrow="Account recovery"
          title="Locked out? Let's fix that."
          subtitle="We'll email you a secure link so you can choose a new password."
          primaryCta={{ label: "Contact support", href: "/help" }}
          size="md"
        />
      }
    >
      <ForgotPasswordForm headingLevel="h2" />
    </AuthSplitShell>
  );
}
