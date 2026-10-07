"use client";

import { useEffect, useRef, useState } from "react";
import {
  CornerUpLeftIcon,
  FileTextIcon,
  FlagIcon,
  MoreVerticalIcon,
  PlusIcon,
  SmileIcon,
  Trash2Icon,
} from "@/components/ui/Icons";
import { Icon } from "@/components/ui/Icon/Icon";
import {
  EDIT_WINDOW_MS,
  REACTION_EMOJIS,
} from "@/lib/messaging/constants";
import type { MessageView } from "@/lib/messaging/types";
import { SharedItemCard } from "@/components/messaging/SharedItemCard/SharedItemCard";
import { VoiceNotePlayer } from "@/components/messaging/VoiceNotePlayer/VoiceNotePlayer";
import "./MessageBubble.css";

export interface MessageBubbleProps {
  message: MessageView;
  isMine: boolean;
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
  onReply,
  onReact,
  onForward,
  onEdit,
  onDelete,
  onReport,
  className,
}: MessageBubbleProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const onPointer = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setPickerOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, pickerOpen]);

  const deleted = message.status === "DELETED";
  const canEdit =
    isMine &&
    !deleted &&
    Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS &&
    Boolean(message.body) &&
    message.attachments.length === 0 &&
    !message.voiceNote &&
    !message.sharedItem;
  const canDeleteForEveryone = isMine && !deleted;

  const classes = [
    "msg-bubble",
    isMine ? "msg-bubble--mine" : "msg-bubble--theirs",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
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
            <VoiceNotePlayer
              url={message.voiceNote.url}
              durationMs={message.voiceNote.duration}
              mine={isMine}
            />
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
          {isMine && message.readByOther ? (
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

      {!deleted ? (
        <div className="msg-bubble__actions" ref={menuRef}>
          <div
            className={[
              "msg-bubble__picker",
              pickerOpen ? "" : "msg-bubble__picker--hidden",
            ]
              .filter(Boolean)
              .join(" ")}
            role="menu"
            aria-label="Pick a reaction"
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message, emoji);
                  setPickerOpen(false);
                }}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="msg-bubble__action"
            onClick={() => {
              setPickerOpen((open) => !open);
              setMenuOpen(false);
            }}
            aria-label="React to this message"
            aria-pressed={pickerOpen}
          >
            <Icon as={SmileIcon} size={14} />
          </button>

          <button
            type="button"
            className="msg-bubble__action"
            onClick={() => {
              setMenuOpen((open) => !open);
              setPickerOpen(false);
            }}
            aria-label="Message actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Icon as={MoreVerticalIcon} size={14} />
          </button>

          <div
            className={[
              "msg-bubble__menu",
              menuOpen ? "" : "msg-bubble__menu--hidden",
            ]
              .filter(Boolean)
              .join(" ")}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onReply(message);
                setMenuOpen(false);
              }}
            >
              <Icon as={CornerUpLeftIcon} size={14} />
              Reply
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onForward(message);
                setMenuOpen(false);
              }}
            >
              <Icon as={PlusIcon} size={14} />
              Forward…
            </button>
            {canEdit ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onEdit(message);
                  setMenuOpen(false);
                }}
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDelete(message, "me");
                setMenuOpen(false);
              }}
            >
              <Icon as={Trash2Icon} size={14} />
              Delete for me
            </button>
            {canDeleteForEveryone ? (
              <button
                type="button"
                role="menuitem"
                className="msg-bubble__menu-danger"
                onClick={() => {
                  onDelete(message, "everyone");
                  setMenuOpen(false);
                }}
              >
                Delete for everyone
              </button>
            ) : null}
            {!isMine ? (
              <button
                type="button"
                role="menuitem"
                className="msg-bubble__menu-danger"
                onClick={() => {
                  onReport(message);
                  setMenuOpen(false);
                }}
              >
                <Icon as={FlagIcon} size={14} />
                Report
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
