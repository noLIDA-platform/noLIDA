import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSettings } from "./AccountSettings";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getOwnProfile } from "@/lib/server/services/profile.service";

export const metadata: Metadata = { title: "Account" };

/**
 * `/settings/account` — photo, names, username, bio.
 *
 * A Server Component that reads the profile and hands it to the client island,
 * rather than the client fetching `/api/profiles/me` on mount. Same data either
 * way; this way there is no waterfall and no flash of an empty form.
 *
 * The `(main)` layout already guards this route, so `getCurrentSessionUser`
 * here is belt-and-braces rather than the only check — it costs one indexed
 * lookup and means this page is correct even if it is ever moved.
 */
export default async function SettingsAccountPage() {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) redirect("/");

  // A profile row is created at registration, so this only fails for an account
  // that predates that. Redirect rather than render a form with nothing to save.
  const profile = await getOwnProfile(sessionUser.user.id).catch(() => null);
  if (!profile) redirect("/settings");

  return <AccountSettings profile={profile} />;
}