import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <PagePlaceholder
      icon={Bell}
      title="Notifications"
      description="Order updates, messages and account alerts in one timeline. Until notifications are generated and stored, the bell in the top bar stays unbadged rather than showing a count that means nothing."
    />
  );
}