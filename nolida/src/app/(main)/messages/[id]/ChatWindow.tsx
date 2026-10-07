"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatHeader } from "@/components/messaging/ChatHeader/ChatHeader";
import { MessageBubble } from "@/components/messaging/MessageBubble/MessageBubble";
import { MessageComposer, type ComposerReplyContext } from "@/components/messaging/MessageComposer/MessageComposer";
import { TypingIndicator } from "@/components/messaging/TypingIndicator/TypingIndicator";
import {
  MESSAGE_PAGE_SIZE,
  POLL_INTERVAL_MS,
} from "@/lib/messaging/constants";
import "./ChatWindow.css";

export interface ChatWindowProps {
  initialConversation: ConversationView;
  initialMessages: MessageView[];
  viewerId: string;
}

function formatDateDivider(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function ChatWindow({
  initialConversation,
  initialMessages,
  viewerId,
}: ChatWindowProps): React.JSX.Element {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState<MessageView[]>(initialMessages);
  const [replyTo, setReplyTo] = useState<ComposerReplyContext | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);
  const typingRef = useRef<number | null>(null);

  const otherName =
    conversation.otherUser.displayName ??
    conversation.otherUser.username ??
    "Someone";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("instant");
  }, [initialMessages, scrollToBottom]);

  // Polling fallback for new messages.
  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const result = await apiFetch<{
          items: MessageView[];
          nextCursor: string | null;
        }>(`/api/conversations/${conversation.id}/messages?limit=${MESSAGE_PAGE_SIZE}`);
        if (!result.ok) return;
        const incoming = result.data.items;
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = incoming.filter((m) => !ids.has(m.id));
          if (fresh.length === 0) return prev;
          return [...prev, ...fresh];
        });
      } catch {
        // network blips are not fatal — the next tick recovers
      }
    }

    tick();
    pollRef.current = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [conversation.id]);

  // Typing indicator refresh.
  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const result = await apiFetch<{ typing: boolean }>(
          `/api/conversations/${conversation.id}`
        );
        if (!result.ok) return;
        setConversation((prev) => ({ ...prev, typing: result.data.typing }));
      } catch {
        // ignore
      }
    }

    tick();
    typingRef.current = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (typingRef.current !== null) window.clearInterval(typingRef.current);
    };
  }, [conversation.id]);

  // Mark read when visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void apiFetch(`/api/conversations/${conversation.id}/read`, {
              method: "POST",
            });
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [conversation.id]);

  const handleSend = useCallback(
    async (payload: {
      body: string;
      attachments?: { url: string; kind: string; name: string; size: number }[];
      voiceNote?: { url: string; duration: number };
      replyToId?: string;
    }) => {
      setSending(true);
      const optimistic: MessageView = {
        id: `optimistic-${Date.now()}`,
        conversationId: conversation.id,
        sender: { id: viewerId, username: null, displayName: null, avatarUrl: null },
        body: payload.body,
        attachments: payload.attachments ?? [],
        voiceNote: payload.voiceNote ?? null,
        sharedItem: null,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderId: "",
              senderName: replyTo.name,
              preview: replyTo.preview,
              deleted: false,
            }
          : null,
        forwarded: false,
        status: "SENT",
        editedAt: null,
        createdAt: new Date().toISOString(),
        reactions: [],
        readByOther: false,
      };
      setMessages((prev) => [...prev, optimistic]);
      setReplyTo(null);
      scrollToBottom("smooth");

      try {
        const result = await apiFetch<{ message: MessageView }>(
          `/api/conversations/${conversation.id}/messages`,
          {
            method: "POST",
            body: {
              body: payload.body || undefined,
              attachments: payload.attachments,
              voiceNote: payload.voiceNote,
              replyToId: payload.replyToId,
            },
          }
        );
        if (!result.ok) throw new Error(result.error.message);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? result.data.message : m))
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversation.id, viewerId, replyTo, scrollToBottom]
  );

  const handleReply = (message: MessageView) => {
    const sender =
      message.sender.displayName ??
      message.sender.username ??
      "Message";
    const preview = message.body
      ? message.body.slice(0, 80)
      : message.attachments.length > 0
        ? "Attachment"
        : message.voiceNote
          ? "Voice note"
          : "Message";
    setReplyTo({ id: message.id, name: sender, preview });
  };

  const handleReact = (message: MessageView, emoji: string) => {
    const mine = message.reactions.find((r) => r.mine);
    const method = mine && mine.emoji === emoji ? "DELETE" : "POST";
    const path = `/api/messages/${message.id}/reactions`;

    if (method === "DELETE") {
      void apiFetch(path, { method: "DELETE" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                reactions: m.reactions
                  .filter((r) => !(r.mine && r.emoji === emoji))
                  .map((r) =>
                    r.emoji === emoji && !r.mine
                      ? { ...r, count: r.count - 1 }
                      : r
                  )
                  .filter((r) => r.count > 0),
              }
            : m
        )
      );
    } else {
      void apiFetch(path, {
        method: "POST",
        body: { emoji },
      });
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== message.id) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          if (existing) {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r
              ),
            };
          }
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, mine: true }],
          };
        })
      );
    }
  };

  const handleForward = (message: MessageView) => {
    // Forward modal would go here; for now just copy the message id
    const ids = prompt(
      "Enter up to 5 conversation IDs separated by commas:"
    );
    if (!ids) return;
    const conversationIds = ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (conversationIds.length === 0) return;
    void apiFetch(`/api/messages/${message.id}/forward`, {
      method: "POST",
      body: { conversationIds },
    });
  };

  const handleDelete = (message: MessageView, scope: "me" | "everyone") => {
    const url = new URL(`/api/messages/${message.id}`, window.location.origin);
    url.searchParams.set("scope", scope);
    void apiFetch(url.pathname + url.search, { method: "DELETE" });
    if (scope === "me") {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, status: "DELETED" as const, body: null, attachments: [], voiceNote: null, sharedItem: null } : m
        )
      );
    }
  };

  const handleReport = (message: MessageView) => {
    const reason = prompt(
      "Reason (SPAM, HARASSMENT, SCAM, INAPPROPRIATE, OTHER):"
    );
    if (!reason) return;
    void apiFetch(`/api/messages/${message.id}/report`, {
      method: "POST",
      body: { reason: reason.toUpperCase() },
    });
  };

  const handleOpenMenu = (action: string) => {
    setMenuOpen(!menuOpen);
  };

  // Group messages by date.
  const groups: { date: string; items: MessageView[] }[] = [];
  let currentDate: string | null = null;
  for (const message of messages) {
    const date = formatDateDivider(message.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, items: [message] });
    } else {
      groups[groups.length - 1].items.push(message);
    }
  }

  return (
    <div className="chat-window">
      <ChatHeader
        conversation={conversation}
        onBack={() => window.history.back()}
        onOpenMenu={handleOpenMenu}
        onSearch={() => {
          const q = prompt("Search in conversation:");
          if (q) window.location.href = `/messages/${conversation.id}?q=${encodeURIComponent(q)}`;
        }}
      />

      <div className="chat-window__body" ref={scrollRef}>
        {groups.map((group) => (
          <div key={group.date} className="chat-window__group">
            <div className="chat-window__divider">
              <span>{group.date}</span>
            </div>
            {group.items.map((message, idx) => {
              const prev = group.items[idx - 1];
              const showTail =
                !prev ||
                prev.sender.id !== message.sender.id ||
                new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() > 60_000;
              const isMine = message.sender.id === viewerId;
              const lastInGroup =
                idx === group.items.length - 1 ||
                group.items[idx + 1]?.sender.id !== message.sender.id;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isMine={isMine}
                  showTail={showTail}
                  onReply={handleReply}
                  onReact={handleReact}
                  onForward={handleForward}
                  onDelete={handleDelete}
                  onReport={handleReport}
                />
              );
            })}
          </div>
        ))}
        {conversation.typing ? (
          <TypingIndicator label={`${otherName} is typing…`} />
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="chat-window__footer">
        <MessageComposer
          conversationId={conversation.id}
          viewerId={viewerId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={handleSend}
          sending={sending}
        />
      </div>
    </div>
  );
}
