import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileOverview } from "@/components/app/ProfileOverview/ProfileOverview";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { toShellUser } from "@/lib/client/shell-user";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your noLIDA name, verification status and account details.",
};

/**
 * `/profile` — the user's own profile.
 *
 * Verification state comes from the session's timestamps rather than from a
 * client flag, and the join date is formatted on the server with a fixed locale
 * so the same account reads the same way in every browser.
 */
export default async function ProfilePage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  return (
    <ProfileOverview
      user={toShellUser(session)}
      emailVerified={Boolean(session.user.email_verified_at)}
      phoneVerified={Boolean(session.user.phone_verified_at)}
      memberSince={new Date(session.user.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })}
    />
  );
}