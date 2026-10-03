import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Analytics" };

/** `/my-business/analytics` — placeholder (Phase 8C). */
export default function MyBusinessAnalyticsPage() {
  return (
    <ComingSoonPanel
      icon={Search}
      title="Analytics are coming soon"
      description="Business analytics will appear here. Track your revenue, bookings, and customers."
      phase="Analytics launch in a later phase."
    />
  );
}
