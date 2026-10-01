import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplitShell } from "@/components/layout/AuthSplitShell/AuthSplitShell";
import { HeroBlock } from "@/components/marketing/HeroBlock/HeroBlock";
import { LoginForm } from "@/components/auth/LoginForm/LoginForm";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";

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
 *
 * Someone who arrives already holding a live session is sent to `/home` instead
 * of being asked to sign in again. The check is free for anonymous visitors:
 * with no cookie, `getCurrentSessionUser` returns before touching the database.
 * A session that has expired or lost its account still lands here, because
 * `getCurrentSessionUser` treats those as signed out.
 */
export default async function LoginPage() {
  if (await getCurrentSessionUser()) redirect("/home");

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
