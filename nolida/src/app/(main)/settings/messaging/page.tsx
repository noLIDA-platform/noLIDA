import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { getGlobalMessagingPrefs } from "@/lib/server/services/messaging.service";
import { MessagingSettings } from "./MessagingSettings";

export const metadata: Metadata = { title: "Messaging" };

/**
 * `/settings/messaging` — the two global toggles (read receipts, typing
 * indicator). A Server Component reads the current values and hands them to
 * the client island, so the switches render in their saved position instead
 * of flashing the defaults first — same pattern as `/settings/account`.
 */
export default async function SettingsMessagingPage() {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) redirect("/");

  const prefs = await getGlobalMessagingPrefs(sessionUser.user.id).catch(
    () => null
  );
  if (!prefs) redirect("/settings");

  return <MessagingSettings initial={prefs} />;
}
