"use client";

import {
  CornerUpLeftIcon,
  FileTextIcon,
  Trash2Icon,
} from "@/components/ui/Icons";
import { Icon } from "@/components/ui/Icon/Icon";
import type { MessageView } from "@/lib/messaging/types";
import { SharedItemCard } from "@/components/messaging/SharedItemCard/SharedItemCard";

import "./MessageBubble.css";

export interface MessageBubbleProps {
  message: MessageView;
  isMine: boolean;
  /** GROUP chats: label the first message of each sender-run with their name. */
  showSenderName?: boolean;
  /** Last bubble of a run — draws the WhatsApp-style tail. */
  showTail?: boolean;
  /**
   * WhatsApp shows receipts only under the LAST message the viewer sent —
   * every bubble knows its own read state, but only one may display it.
   */
  showReceipt?: boolean;
  onReply: (message: MessageView) => void;
  onReact: (message: MessageView, emoji: string) => void;
  onForward: (message: MessageView) => void;
  onEdit: (message: MessageView) => void;
  onDelete: (message: MessageView, scope: "me" | "everyone") => void;
  onReport: (message: MessageView) => void;
  className?: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * GROUP sender-name palette. The colour is a pure function of the sender id,
 * so the same person is always the same colour in every group run — no state,
 * no assignment pass, and two members cannot collide by coordination. The
 * palette lives in CSS (`--msg-sender-1..6`); this only picks the index.
 */
const SENDER_COLOR_COUNT = 6;

function senderColorIndex(senderId: string): number {
  let hash = 0;
  for (let i = 0; i < senderId.length; i += 1) {
    hash = (hash * 31 + senderId.charCodeAt(i)) >>> 0;
  }
  return (hash % SENDER_COLOR_COUNT) + 1;
}

/**
 * One message in the thread.
 *
 * The action menu is the single surface for reply/react/forward/edit/delete/
 * report — a toolbar permanently under every bubble would quadruple the ink
 * of a conversation. It opens on click, closes on outside click or Escape,
 * and renders only actions THIS message allows: mine gets edit and delete,
 * theirs gets report, and edit disappears once the window closes (an edit
 * past 15 minutes is a slower delete, not a save).
 */
export function MessageBubble({
  message,
  isMine,
  showSenderName,
  showTail,
  showReceipt = false,
  onReply,
  onReact,
  onForward,
  onEdit,
  onDelete,
  onReport,
  className,
}: MessageBubbleProps): React.JSX.Element {
  const deleted = message.status === "DELETED";

  const classes = [
    "msg-bubble",
    isMine ? "msg-bubble--mine" : "msg-bubble--theirs",
    showTail ? "msg-bubble--tail" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      {!isMine && showSenderName && !deleted ? (
        <span
          className="msg-bubble__sender"
          style={{
            // Deterministic per-sender colour (see senderColorIndex). Falls
            // back to the token when the custom property is unavailable.
            "--msg-sender-color": `var(--msg-sender-${senderColorIndex(message.sender.id)})`,
          } as React.CSSProperties}
        >
          {message.sender.displayName ?? message.sender.username ?? "Someone"}
        </span>
      ) : null}

      {message.replyTo ? (
        <div className="msg-bubble__reply">
          <Icon as={CornerUpLeftIcon} size={12} />
          <span className="msg-bubble__reply-name">
            {message.replyTo.deleted
              ? "Deleted message"
              : message.replyTo.senderName}
          </span>
          <span className="msg-bubble__reply-text">{message.replyTo.preview}</span>
        </div>
      ) : null}

      {message.forwarded && !deleted ? (
        <span className="msg-bubble__forwarded">Forwarded</span>
      ) : null}

      {deleted ? (
        <p className="msg-bubble__deleted">
          <Icon as={Trash2Icon} size={13} />
          {isMine ? "You deleted this message" : "Message deleted"}
        </p>
      ) : (
        <>
          {message.body ? <p className="msg-bubble__body">{message.body}</p> : null}

          {message.attachments.length > 0 ? (
            <div className="msg-bubble__attachments">
              {message.attachments.map((attachment) =>
                attachment.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- chat images are preview-sized; the optimizer would add a hop per bubble
                  <img
                    key={attachment.url}
                    className="msg-bubble__image"
                    src={attachment.url}
                    alt={attachment.name}
                    loading="lazy"
                  />
                ) : (
                  <a
                    key={attachment.url}
                    className="msg-bubble__file"
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.name}
                  >
                    <Icon as={FileTextIcon} size={18} />
                    <span className="msg-bubble__file-text">
                      <span className="msg-bubble__file-name">{attachment.name}</span>
                      <span className="msg-bubble__file-size">
                        {formatBytes(attachment.size)}
                      </span>
                    </span>
                  </a>
                ),
              )}
            </div>
          ) : null}

          {message.voiceNote ? (
            <span className="msg-bubble__voice-placeholder">Voice message (not available)</span>
          ) : null}

          {message.sharedItem ? (
            <SharedItemCard item={message.sharedItem} mine={isMine} />
          ) : null}
        </>
      )}

      {!deleted && (message.body || message.attachments.length > 0) ? (
        <div className="msg-bubble__meta">
          {message.editedAt ? <span>edited</span> : null}
          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
          {isMine && showReceipt && message.readByOther ? (
            <span className="msg-bubble__read" title="Read">
              ✓✓
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Reactions: tapping mine removes it; tapping theirs offers the same. */}
      {message.reactions.length > 0 ? (
        <div className="msg-bubble__reactions">
          {message.reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              className={[
                "msg-bubble__reaction",
                reaction.mine ? "msg-bubble__reaction--mine" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onReact(message, reaction.emoji)}
              aria-label={
                reaction.mine
                  ? `Remove your ${reaction.emoji} reaction`
                  : `React with ${reaction.emoji}`
              }
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              {reaction.count > 1 ? <span>{reaction.count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
