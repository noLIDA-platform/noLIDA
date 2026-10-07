import type { Metadata } from "next";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import * as messagingService from "@/lib/server/services/messaging.service";
import { ConversationList } from "@/components/messaging/ConversationList/ConversationList";
import { CONVERSATION_PAGE_SIZE } from "@/lib/messaging/constants";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getCurrentSessionUser();
  const q = (await searchParams).q;

  const page = await messagingService.listConversations({
    userId: session.user.id,
    limit: CONVERSATION_PAGE_SIZE,
  });

  return (
    <div className="messages-page">
      <ConversationList conversations={page.items} />
    </div>
  );
}
