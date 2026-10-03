import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Customers" };

/** `/my-business/customers` — placeholder (Phase 8C). */
export default function MyBusinessCustomersPage() {
  return (
    <ComingSoonPanel
      icon={Users}
      title="Customers are coming soon"
      description="Customers who book or buy from you will appear here."
      phase="Customers arrive with the first completed order or booking."
    />
  );
}
