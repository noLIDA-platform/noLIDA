import type { Metadata } from "next";
import { Palette } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Appearance & language" };

export default function SettingsAppearancePage() {
  return (
    <PagePlaceholder
      icon={Palette}
      title="Appearance & language"
      backHref="/settings"
      backLabel="Back to settings"
      description="Light or dark theme, plus your language, currency and location. The brand palette is fixed — this screen only chooses between the two themes, and the switch in the profile drawer stays disabled until a preference can actually be saved."
    />
  );
}