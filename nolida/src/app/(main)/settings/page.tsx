import type { Metadata } from "next";
import { SettingsMenu } from "@/components/app/SettingsMenu/SettingsMenu";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account, money, preferences and support for your noLIDA account.",
};

/**
 * `/settings` — the grouped index of every account destination.
 *
 * A Server Component rendering plain links: nine of the ten destinations are
 * still being built, so there is nothing here worth hydrating.
 */
export default function SettingsPage() {
  return <SettingsMenu />;
}