"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CopyIcon,
  CornerUpLeftIcon,
  ShareIcon,
  Trash2Icon,
} from "@/components/ui/Icons";
import { Icon } from "@/components/ui/Icon/Icon";
import type { MessageView } from "@/lib/messaging/types";
import "./MessageActionsMenu.css";

/**
 * WhatsApp-style long-press / right-click menu. The floating card carries
 * the six fixed reaction emojis plus Reply / Forward / Copy / Delete — every
 * action delegates to the ChatWindow handlers the thread already owns, so
 * this component adds surface, never behaviour.
 */
export interface MessageActionsMenuProps {
  message: MessageView;
  isOwn: boolean;
  /** Press point in client coordinates — the card is clamped on-screen. */
  x: number;
  y: number;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const MENU_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🙏"] as const;

const MENU_WIDTH = 220;
const MENU_MARGIN = 8;

export function MessageActionsMenu({
  message,
  isOwn,
  x,
  y,
  onReact,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onClose,
}: MessageActionsMenuProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // Clamp the card on-screen once its height is known.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const cardHeight = cardRef.current?.offsetHeight ?? 280;
    const left = Math.max(
      MENU_MARGIN,
      Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    );
    const top = Math.max(
      MENU_MARGIN,
      Math.min(y, window.innerHeight - cardHeight - MENU_MARGIN)
    );
    setPosition({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canCopy = Boolean(message.body);

  return (
    <div
      className="msg-actions-menu__overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="msg-actions-menu"
        role="menu"
        aria-label="Message actions"
        style={{ left: position.left, top: position.top }}
      >
        <div className="msg-actions-menu__emojis" role="group" aria-label="React">
          {MENU_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="msg-actions-menu__emoji"
              onClick={() => {
                onReact(emoji);
                onClose();
              }}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="msg-actions-menu__divider" aria-hidden="true" />

        <button
          type="button"
          role="menuitem"
          className="msg-actions-menu__item"
          onClick={() => {
            onReply();
            onClose();
          }}
        >
          <Icon as={CornerUpLeftIcon} size={20} />
          Reply
        </button>
        <button
          type="button"
          role="menuitem"
          className="msg-actions-menu__item"
          onClick={() => {
            onForward();
            onClose();
          }}
        >
          <Icon as={ShareIcon} size={20} />
          Forward
        </button>
        {canCopy ? (
          <button
            type="button"
            role="menuitem"
            className="msg-actions-menu__item"
            onClick={() => {
              onCopy();
              onClose();
            }}
          >
            <Icon as={CopyIcon} size={20} />
            Copy
          </button>
        ) : null}
        {isOwn ? (
          <button
            type="button"
            role="menuitem"
            className="msg-actions-menu__item msg-actions-menu__item--danger"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            <Icon as={Trash2Icon} size={20} />
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
