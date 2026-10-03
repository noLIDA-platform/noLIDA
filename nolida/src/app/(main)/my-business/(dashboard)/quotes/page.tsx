import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Quotes" };

/** `/my-business/quotes` — placeholder (Phase 8C). */
export default function MyBusinessQuotesPage() {
  return (
    <ComingSoonPanel
      icon={FileText}
      title="Quotes are coming soon"
      description="Quotes you send to customers will appear here."
      phase="Quotes launch in a later phase."
    />
  );
}
