import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { ComingSoonPanel } from "@/components/business/ComingSoonPanel/ComingSoonPanel";

export const metadata: Metadata = { title: "Orders" };

/** `/my-business/orders` — placeholder (Phase 8C), real with the orders system. */
export default function MyBusinessOrdersPage() {
  return (
    <ComingSoonPanel
      icon={ShoppingCart}
      title="Orders are coming soon"
      description="Product orders will appear here. Order management launches soon."
      phase="Orders launch in a later phase."
    />
  );
}
