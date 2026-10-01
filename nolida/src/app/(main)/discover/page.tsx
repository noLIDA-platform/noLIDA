import type { Metadata } from "next";
import { Search } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <PagePlaceholder
      icon={Search}
      title="Discover"
      description="Search and browse services, businesses and people near you. The search index and category filters are built in a later phase, so the top bar's search field leads here in the meantime."
    />
  );
}