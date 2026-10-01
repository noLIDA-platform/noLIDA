import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <PagePlaceholder
      icon={ShoppingCart}
      title="Cart"
      description="Items you are about to order, with totals and the wallet payment step. Prices, fees and totals are calculated on the server when checkout opens — never carried over from a client — so an empty cart today is safer than a suggested one."
    />
  );
}