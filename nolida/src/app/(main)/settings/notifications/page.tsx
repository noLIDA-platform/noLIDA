import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Notification preferences" };

/**
 * `/settings/notifications` holds the *preferences*; `/notifications` holds the
 * timeline. Same word, two different jobs — the spec keeps them apart so a
 * person can silence a category without hunting for it inside their inbox.
 */
export default function SettingsNotificationsPage() {
  return (
    <PagePlaceholder
      icon={Bell}
      title="Notifications"
      backHref="/settings"
      backLabel="Back to settings"
      description="Choose which alerts reach you in-app, by email or by WhatsApp. These switches need the notification types to exist first, so nothing is offered here that the app cannot yet send."
    />
  );
}