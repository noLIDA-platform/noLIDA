import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Earnings" };

/** `/my-business/earnings` — placeholder (Phase 8C), real with the wallet. */
export default function MyBusinessEarningsPage() {
  return (
    <ComingSoonPanel
      icon={Wallet}
      title="Earnings are coming soon"
      description="Your earnings will appear here once you make your first sale. The wallet system launches in a later phase."
      phase="The wallet system launches in a later phase."
    />
  );
}
