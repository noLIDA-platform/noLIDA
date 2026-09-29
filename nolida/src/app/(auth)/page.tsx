import type { Metadata } from "next";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { LoginForm } from "@/components/auth/LoginForm/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to noLIDA to discover, request, book, and pay — all in one place.",
};

/**
 * The noLIDA front door: sign-in.
 *
 * `/` is the login page, so the marketing landing page that used to live here
 * is gone (its sections survive on `/how-it-works`, `/for-business`, `/pricing`
 * and `/about`). The hero copy rides inside the gradient panel as `beneathStack`
 * so the whole screen stays one viewport tall.
 */
export default function LoginPage() {
  return (
    <AuthSplitShell
      orientation="form-right"
      beneathStack={
        <HeroBlock
          eyebrow="Nigeria's all-in-one platform"
          title="Discover, request, book, and pay — all in one place."
          subtitle="Find what you need, offer what you do, and get paid — without leaving the app."
          primaryCta={{ label: "Create account", href: "/signup" }}
          secondaryCta={{ label: "How it works", href: "/how-it-works" }}
          size="md"
        />
      }
    >
      <LoginForm headingLevel="h2" redirectTo="/home" />
    </AuthSplitShell>
  );
}
