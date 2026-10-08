import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import * as messagingService from "@/lib/server/services/messaging.service";
import type { ConversationView } from "@/lib/messaging/types";
import { ConversationList } from "@/components/messaging/ConversationList/ConversationList";
import { CONVERSATION_PAGE_SIZE } from "@/lib/messaging/constants";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");
  const userId = session.user.id;

  const conversations = await messagingService.listConversations({
    userId,
    limit: CONVERSATION_PAGE_SIZE,
  });

  function handleConversationMenu(
    id: string,
    action: "pin" | "mute" | "archive" | "delete",
    current: boolean
  ) {
    if (action === "delete") return;
    const next = !current;
    const field: "pinned" | "muted" | "archived" =
      action === "pin" ? "pinned" : action === "mute" ? "muted" : "archived";
    void messagingService
      .updateConversationSettings({
        userId,
        conversationId: id,
        fields: { [field]: next },
      })
      .catch(() => undefined);
  }

  return (
    <div className="messages-page">
      <ConversationList
        conversations={conversations.items}
        userId={userId}
        onMenu={handleConversationMenu}
      />
    </div>
  );
}
