"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatHeader } from "@/components/messaging/ChatHeader/ChatHeader";
import { MessageActionsMenu } from "@/components/messaging/MessageActionsMenu/MessageActionsMenu";
import { MessageBubble } from "@/components/messaging/MessageBubble/MessageBubble";
import { MessageComposer, type ComposerReplyContext, type AttachmentInput } from "@/components/messaging/MessageComposer/MessageComposer";
import { TypingIndicator } from "@/components/messaging/TypingIndicator/TypingIndicator";
import { apiFetch } from "@/lib/client/api";
import type { ConversationView, MessageView } from "@/lib/messaging/types";
import {
  MESSAGE_PAGE_SIZE,
  POLL_INTERVAL_MS,
  TYPING_DEBOUNCE_MS,
  TYPING_POLL_INTERVAL_MS,
  TYPING_THROTTLE_MS,
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  /** Long-press (touch) or right-click (desktop) menu anchor. */
  const [menuState, setMenuState] = useState<{
    message: MessageView;
    x: number;
    y: number;
  } | null>(null);
  const [sending, setSending] = useState(false);
  /** Live "someone else is typing" flag, polled every 1.5s (see below). */
  const [othersTyping, setOthersTyping] = useState(false);
  /** First typer's name from the server — needed in group chats. */
  const [typingName, setTypingName] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);
  const typingRef = useRef<number | null>(null);
  /** Throttle: while set, further typing POSTs are suppressed. */
  const typingThrottleRef = useRef<number | null>(null);
  /** Debounce: reset on every keystroke; fires the DELETE when it expires. */
  const typingDebounceRef = useRef<number | null>(null);
  /** True while the server holds an armed flag for US that we haven't cleared. */
  const typingArmedRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Typing: poll the dedicated lightweight endpoint every 1.5s. The old
  // approach polled GET /api/conversations/[id] — the FULL conversation
  // fetch — at the 5s message cadence, which is why a typing start took
  // 0–5s to appear (and burned a heavy query to do it). The poll pauses
  // while the tab is hidden: no battery, no server load, no stale burst
  // of catch-up requests when the user returns.
  useEffect(() => {
    let cancelled = false;

    async function checkTyping() {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      try {
        const result = await apiFetch<{ typing: boolean; name: string | null }>(
          `/api/conversations/${conversation.id}/typing`
        );
        if (!result.ok || cancelled) return;
        setOthersTyping(result.data.typing);
        setTypingName(result.data.name);
        // Keep conversation.typing in step so ChatHeader's "typing…" status
        // shows the same truth as the bubble below the thread.
        setConversation((prev) =>
          prev.typing === result.data.typing
            ? prev
            : { ...prev, typing: result.data.typing }
        );
      } catch {
        // silent — a dropped poll just retries next tick
      }
    }

    void checkTyping();
    typingRef.current = window.setInterval(checkTyping, TYPING_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (typingRef.current !== null) {
        window.clearInterval(typingRef.current);
        typingRef.current = null;
      }
      setOthersTyping(false);
      setTypingName(null);
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

  /**
   * Typing signal from the composer. Two independent timers, both refs:
   *
   * - THROTTLE: the first keystroke arms the server flag immediately; after
   *   that, further POSTs are suppressed for 1s while typing continues, and
   *   re-armed on the next keystroke past the window. One POST per second
   *   maximum — every keystroke would be ~8 POSTs/s of pure waste.
   * - DEBOUNCE: reset on every keystroke; 3s of silence fires the DELETE so
   *   the other side stops seeing "typing…" promptly instead of waiting out
   *   the server TTL.
   *
   * No setInterval anywhere: typing is bursty, and both timers are
   * one-shot, re-armed by the activity they measure.
   */
  const handleTyping = useCallback(() => {
    if (typingThrottleRef.current === null) {
      typingThrottleRef.current = window.setTimeout(() => {
        typingThrottleRef.current = null;
      }, TYPING_THROTTLE_MS);
      typingArmedRef.current = true;
      void apiFetch(`/api/conversations/${conversation.id}/typing`, {
        method: "POST",
        body: { typing: true },
      });
    }

    if (typingDebounceRef.current !== null) {
      window.clearTimeout(typingDebounceRef.current);
    }
    typingDebounceRef.current = window.setTimeout(() => {
      typingDebounceRef.current = null;
      if (!typingArmedRef.current) return;
      typingArmedRef.current = false;
      void apiFetch(`/api/conversations/${conversation.id}/typing`, {
        method: "DELETE",
      });
    }, TYPING_DEBOUNCE_MS);
  }, [conversation.id]);

  /**
   * Clear OUR typing flag now: on send (the message itself is the signal)
   * and on unmount/conversation switch (don't leave a phantom "typing…"
   * behind for the 5s TTL). No-op if we never armed or already cleared.
   */
  const stopTyping = useCallback(() => {
    if (typingThrottleRef.current !== null) {
      window.clearTimeout(typingThrottleRef.current);
      typingThrottleRef.current = null;
    }
    if (typingDebounceRef.current !== null) {
      window.clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
    if (!typingArmedRef.current) return;
    typingArmedRef.current = false;
    void apiFetch(`/api/conversations/${conversation.id}/typing`, {
      method: "DELETE",
    });
  }, [conversation.id]);

  // Leaving the chat (switch conversation or unmount) must not leave the
  // flag armed — stopTyping clears the timers and the server row.
  useEffect(() => stopTyping, [conversation.id, stopTyping]);

  const handleSend = useCallback(
    async (payload: {
      body: string;
      attachments?: AttachmentInput[];
      voiceNote?: { url: string; duration: number };
      replyToId?: string;
    }) => {
      setSending(true);
      stopTyping();
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
    [conversation.id, viewerId, replyTo, scrollToBottom, stopTyping]
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

  const handleEdit = (message: MessageView) => {
    const next = prompt("Edit message:", message.body ?? "");
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === message.body) return;
    void (async () => {
      const result = await apiFetch<{ message: MessageView }>(
        `/api/messages/${message.id}`,
        { method: "PATCH", body: { body: trimmed } }
      );
      if (result.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? result.data.message : m))
        );
      }
    })();
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

  // WhatsApp shows receipts only under the LAST message the viewer sent —
  // one id, computed over the flat list, passed down as showReceipt.
  const lastOwnMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender.id === viewerId) return messages[i].id;
    }
    return null;
  })();

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

  // In GROUP chats the first message of each sender-run carries the sender's
  // name (WhatsApp convention). A run ends when the sender changes or the day
  // rolls over — computed over the flat list, not per date group, so a run
  // never leaks across a date divider.
  const senderNameIds = new Set<string>();
  if (conversation.type === "GROUP") {
    let runSender: string | null = null;
    let runDay: string | null = null;
    for (const message of messages) {
      const day = new Date(message.createdAt).toDateString();
      if (message.sender.id !== runSender || day !== runDay) {
        senderNameIds.add(message.id);
      }
      runSender = message.sender.id;
      runDay = day;
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
        onOpenInfo={() => {
          window.location.href = `/messages/${conversation.id}/info`;
        }}
      />

      <div className="chat-window__body" ref={scrollRef}>
        {groups.map((group) => (
          <div key={group.date} className="chat-window__group">
            <div className="chat-window__divider">
              <span>{group.date}</span>
            </div>
            {group.items.map((message, idx) => {
              const isMine = message.sender.id === viewerId;
              // The tail sits on the LAST bubble of a run — mine or theirs.
              // A run ends at the end of the day group or at the first
              // message from the other side.
              const next = group.items[idx + 1];
              const showTail = !next || next.sender.id !== message.sender.id;

              return (
                <div
                  key={message.id}
                  className="chat-window__row"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    longPressTimer.current = setTimeout(() => {
                      setMenuState({ message: message, x: touch.clientX, y: touch.clientY });
                    }, 500);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                  }}
                  onTouchMove={() => {
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuState({ message: message, x: e.clientX, y: e.clientY });
                  }}
                >
                  <MessageBubble
                    message={message}
                    isMine={isMine}
                    showSenderName={senderNameIds.has(message.id)}
                    showTail={showTail}
                    showReceipt={message.id === lastOwnMessageId}
                    onReply={handleReply}
                    onReact={handleReact}
                    onForward={handleForward}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReport={handleReport}
                  />
                </div>
              );
            })}
          </div>
        ))}
        {othersTyping ? (
          <TypingIndicator
            label={`${typingName ?? otherName} is typing…`}
          />
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="chat-window__footer">
        <MessageComposer
          conversationId={conversation.id}
          viewerId={viewerId}
          replyTo={replyTo}
          replyToId={replyTo?.id}
          onCancelReply={() => setReplyTo(null)}
          onSend={handleSend}
          onType={handleTyping}
        />
      </div>

      {menuState ? (
        <MessageActionsMenu
          message={menuState.message}
          isOwn={menuState.message.sender.id === viewerId}
          x={menuState.x}
          y={menuState.y}
          onReact={(emoji) => {
            handleReact(menuState.message, emoji);
            setMenuState(null);
          }}
          onReply={() => {
            handleReply(menuState.message);
            setMenuState(null);
          }}
          onForward={() => {
            handleForward(menuState.message);
            setMenuState(null);
          }}
          onCopy={() => {
            if (menuState.message.body) {
              void navigator.clipboard?.writeText(menuState.message.body).catch(() => {});
            }
            setMenuState(null);
          }}
          onDelete={() => {
            handleDelete(menuState.message, "me");
            setMenuState(null);
          }}
          onClose={() => setMenuState(null)}
        />
      ) : null}
    </div>
  );
}
