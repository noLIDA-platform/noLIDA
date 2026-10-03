import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Requests" };

/** `/my-business/requests` — placeholder (Phase 8C). */
export default function MyBusinessRequestsPage() {
  return (
    <ComingSoonPanel
      icon={MessageSquare}
      title="Requests are coming soon"
      description="Customer requests will appear here. The request system launches soon."
      phase="Requests launch in a later phase."
    />
  );
}
