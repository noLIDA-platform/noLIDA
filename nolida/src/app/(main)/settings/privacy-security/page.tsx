import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Privacy & Security" };

export default function SettingsPrivacySecurityPage() {
  return (
    <PagePlaceholder
      icon={ShieldCheck}
      title="Privacy & Security"
      backHref="/settings"
      backLabel="Back to settings"
      description="Change your password without leaving the app, review who can see your profile, and turn on two-factor sign-in. Password resets already work through the sign-in screens; a signed-in password change and 2FA need their own flows."
    />
  );
}