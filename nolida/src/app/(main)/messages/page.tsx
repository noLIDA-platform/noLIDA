import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { PagePlaceholder } from "@/components/app/PagePlaceholder/PagePlaceholder";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <PagePlaceholder
      icon={MessageCircle}
      title="Messages"
      description="Conversations with the people you book and buy from. Threads need a messaging backend, delivery receipts and unread counts before they are worth showing, so nothing is faked here."
    />
  );
}