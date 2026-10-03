import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Promotions" };

/** `/my-business/promotions` — placeholder (Phase 8C). */
export default function MyBusinessPromotionsPage() {
  return (
    <ComingSoonPanel
      icon={Heart}
      title="Promotions are coming soon"
      description="Promotions and sponsored posts will appear here."
      phase="Promotions launch in a later phase."
    />
  );
}
