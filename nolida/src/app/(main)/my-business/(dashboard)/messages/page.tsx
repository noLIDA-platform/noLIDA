import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Messages" };

/** `/my-business/messages` — placeholder (Phase 8C), real in Phase 10. */
export default function MyBusinessMessagesPage() {
  return (
    <ComingSoonPanel
      icon={MessageSquare}
      title="Messages are coming soon"
      description="Business messages will appear here. Messaging launches in the next phase."
      phase="Messaging launches in Phase 10."
    />
  );
}
