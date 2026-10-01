import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <PagePlaceholder
      icon={Wallet}
      title="Wallet"
      description="Your balance, top-ups and transfers. Money rules apply here: every balance read comes from a locked Postgres transaction and every mutation needs an idempotency key, so no figure is shown until it is real."
    />
  );
}