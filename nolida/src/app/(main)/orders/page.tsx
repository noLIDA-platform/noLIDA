import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <PagePlaceholder
      icon={Receipt}
      title="Orders"
      description="Every request and booking you have made, with its status and receipt. Orders are created by the booking and checkout phases; this screen will list them once there is an orders table to read."
    />
  );
}