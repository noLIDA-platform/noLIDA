import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import * as messagingService from "@/lib/server/services/messaging.service";
import { ChatWindow } from "./ChatWindow";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
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

  const page = await messagingService.listMessages({
    userId: session.user.id,
    conversationId: id,
    limit: 50,
  });

  return (
    <ChatWindow
      initialConversation={conversation}
      initialMessages={page.items}
      viewerId={session.user.id}
    />
  );
}
