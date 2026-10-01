import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  return (
    <PagePlaceholder
      icon={Plus}
      title="Create"
      description="Publish a post, list a service or open an offer. The composer, media uploads and category picker arrive with the publishing phase — this is the centred button in the bottom bar, so it stays reachable from everywhere."
    />
  );
}