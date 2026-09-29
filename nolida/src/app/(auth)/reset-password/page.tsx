import type { Metadata } from "next";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your noLIDA account.",
};

/**
 * Password reset. The token rides in the query string (`?token=…`), which is
 * how the reset email links here. Only the presence of the token is checked —
 * it is validated by the server when the form is submitted, since a token
 * cannot be trusted just because it arrived in a URL.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = typeof raw === "string" && raw.length > 0 ? raw : null;

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
      <ResetPasswordForm headingLevel="h2" token={token} redirectTo="/" />
    </AuthSplitShell>
  );
}
