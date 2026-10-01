import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Developer" };

export default function SettingsDeveloperPage() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Developer"
      backHref="/settings"
      backLabel="Back to settings"
      description="API keys and webhooks for businesses that integrate their own systems. Keys are hashed the same way sessions are — only the digest is stored — so this screen will show a key once, at creation, and never again."
    />
  );
}