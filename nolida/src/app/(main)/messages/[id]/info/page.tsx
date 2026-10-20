import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import * as messagingService from "@/lib/server/services/messaging.service";
import { ChatInfo } from "@/components/messaging/ChatInfo/ChatInfo";

export const metadata: Metadata = { title: "Conversation info" };

/**
 * `/messages/[id]/info` — the WhatsApp-style info screen, reached from the
 * thread header's tappable identity. Membership is enforced twice: the
 * (main) layout guard, then the service itself (a non-member gets the same
 * 404 the thread page gives them, never a 403 that would confirm the id).
 *
 * The member list is fetched here, on the server — the client island never
 * calls a members API to render its initial state.
 */
export default async function ConversationInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSessionUser();
  if (!session) notFound();

  const { id } = await params;
  let conversation;
  try {
    conversation = await messagingService.getConversation({
      userId: session.user.id,
      conversationId: id,
    });
  } catch {
    notFound();
  }

  const members =
    conversation.type === "GROUP"
      ? await messagingService.listGroupMembers({
          conversationId: id,
          userId: session.user.id,
        })
      : [];

  // Read receipts are a global profile pref; the info page shows the same
  // switch for 1:1 chats so it can be flipped without leaving the chat.
  const prefs = await messagingService
    .getGlobalMessagingPrefs(session.user.id)
    .catch(() => null);

  return (
    <ChatInfo
      conversation={conversation}
      members={members}
      viewerId={session.user.id}
      readReceiptsEnabled={prefs?.readReceiptsEnabled}
    />
  );
}
