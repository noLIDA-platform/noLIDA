import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Payment methods" };

export default function SettingsPaymentMethodsPage() {
  return (
    <PagePlaceholder
      icon={CreditCard}
      title="Payment methods"
      backHref="/settings"
      backLabel="Back to settings"
      description="Cards and bank accounts saved to your account, each held as a token by the payment provider. Card details are never stored in NOlida's database, so this screen will show tokens and last four digits only."
    />
  );
}