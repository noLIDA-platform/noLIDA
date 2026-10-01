import type { Metadata } from "next";
import { Store } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "My business" };

export default function MyBusinessPage() {
  return (
    <PagePlaceholder
      icon={Store}
      title="My business"
      description="Your listings, incoming orders and earnings. Business earnings live in their own tables, separate from the personal wallet, and the dashboard that splits them out arrives with the business phase."
    />
  );
}