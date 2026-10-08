import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";
import { listConversations } from "@/lib/server/services/messaging.service";
import { ConversationList } from "@/components/messaging/ConversationList/ConversationList";
import { CONVERSATION_PAGE_SIZE } from "@/lib/messaging/constants";
import "./page.css";

export const metadata: Metadata = {
  title: "Messages",
};

export const dynamic = "force-dynamic";

/**
 * The messages list: a single column of conversation rows, in the same
 * shape as the working /requests page. The session guard is a redirect for
 * anonymous visitors; the service owns what the viewer may see.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.JSX.Element> {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");

  const conversations = await listConversations({
    userId: session.user.id,
    limit: CONVERSATION_PAGE_SIZE,
  });

  return (
    <div className="messages-page">
      <div className="messages-page__head">
        <header className="messages-page__header">
          <h1 className="messages-page__title">Messages</h1>
        </header>
      </div>

      {conversations.items.length === 0 ? (
        <div className="messages-page__empty">
          <p className="messages-page__empty-text">
            No conversations yet. Message a business or a person from the
            feed to start a thread.
          </p>
        </div>
      ) : (
        <ConversationList
          conversations={conversations.items}
          userId={session.user.id}
        />
      )}
    </div>
  );
}
