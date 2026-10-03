import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Payouts" };

/** `/my-business/payouts` — placeholder (Phase 8C), real with payments. */
export default function MyBusinessPayoutsPage() {
  return (
    <ComingSoonPanel
      icon={Wallet}
      title="Payouts are coming soon"
      description="Payouts to your bank account will appear here."
      phase="Payouts launch alongside the payments system."
    />
  );
}
