import type { Metadata } from "next";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your NOlida account.",
};

/**
 * Password reset, step two. The identifier rides in on the query string
 * (`?identifier=…`) handed over by /forgot-password once a code has been sent.
 * The code itself is entered here, together with the new password, and is
 * validated server-side — nothing that arrives in a URL can be trusted on its
 * own.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.identifier;
  const identifier = typeof raw === "string" && raw.length > 0 ? raw : null;

  return (
    <AuthSplitShell
      orientation="form-right"
      beneathStack={
        <HeroBlock
          eyebrow="Account recovery"
          title="Choose a new password."
          subtitle="Pick something strong and unique — you'll use it every time you sign in."
          primaryCta={{ label: "Contact support", href: "/help" }}
          size="md"
        />
      }
    >
      <ResetPasswordForm headingLevel="h2" identifier={identifier} />
    </AuthSplitShell>
  );
}
