import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Help & support" };

/**
 * `/settings/help` — the in-app support entry point.
 *
 * Deliberately not a second help centre: the public one at `/help` already
 * carries the guides and the WhatsApp fallback, so this screen points at it
 * rather than duplicating answers that would then drift apart.
 */
export default function SettingsHelpPage() {
  return (
    <PagePlaceholder
      icon={LifeBuoy}
      title="Help & support"
      backHref="/settings"
      backLabel="Back to settings"
      description="Guides, safety information and a way to reach the noLIDA team live on the public help centre. Account-specific support topics will be added here once there are support tickets to file against."
      action={{ label: "Open the help centre", href: "/help" }}
    />
  );
}