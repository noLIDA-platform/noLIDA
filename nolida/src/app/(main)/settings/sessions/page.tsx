import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Active sessions" };

export default function SettingsSessionsPage() {
  return (
    <PagePlaceholder
      icon={KeyRound}
      title="Active sessions"
      backHref="/settings"
      backLabel="Back to settings"
      description="Every device signed in to this account, with the option to revoke one or all of them. Sessions and security events are already recorded server-side — this screen reads them instead of guessing."
    />
  );
}