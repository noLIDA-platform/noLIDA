"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArchiveIcon,
  BanIcon,
  BellOffIcon,
  ChevronLeftIcon,
  MoreVerticalIcon,
  PinIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConversationView } from "@/lib/messaging/types";
import "./ConversationList.css";

export interface ConversationListProps {
  conversations: ConversationView[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onMenu?: (id: string, action: string) => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function previewLabel(preview: { kind: string; text: string } | null, fromMe: boolean): string {
  if (!preview) return "";
  if (preview.kind === "DELETED") return "This message was deleted";
  if (fromMe) return `You: ${preview.text}`;
  return preview.text;
}

type MenuAction = "pin" | "mute" | "archive" | "delete";

function MenuIcon({ action }: { action: MenuAction }) {
  const size = 14;
  switch (action) {
    case "pin":
      return <Icon as={PinIcon} size={size} />;
    case "mute":
      return <Icon as={BellOffIcon} size={size} />;
    case "archive":
      return <Icon as={ArchiveIcon} size={size} />;
    case "delete":
      return <Icon as={Trash2Icon} size={size} />;
  }
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onMenu,
}: ConversationListProps): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const name = c.otherUser.displayName ?? c.otherUser.username ?? "";
        const last = c.lastMessage?.text ?? "";
        return (
          name.toLowerCase().includes(search.toLowerCase()) ||
          last.toLowerCase().includes(search.toLowerCase())
        );
      })
    : conversations;

  useEffect(() => {
    if (!menuOpenId) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenId(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  const handleSelect = (id: string) => {
    if (onSelect) onSelect(id);
    else router.push(`/messages/${id}`);
  };

  return (
    <div className="conv-list">
      <div className="conv-list__header">
        <h1 className="conv-list__title">Messages</h1>
      </div>

      <div className="conv-list__search">
        <Icon as={SearchIcon} size={14} />
        <input
          type="search"
          className="conv-list__search-input"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search ? (
          <button
            type="button"
            className="conv-list__search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            <Icon as={XIcon} size={12} />
          </button>
        ) : null}
      </div>

      <ul className="conv-list__items">
        {filtered.length === 0 ? (
          <li className="conv-list__empty">
            {search ? (
              <p>No conversations match your search.</p>
            ) : (
              <>
                <p className="conv-list__empty-title">No messages yet</p>
                <p className="conv-list__empty-body">
                  When you message someone, your conversations will appear here.
                </p>
              </>
            )}
          </li>
        ) : (
          filtered.map((conversation) => {
            const isActive = conversation.id === activeId;
            const menuOpen = menuOpenId === conversation.id;
            const displayName =
              conversation.otherUser.displayName ?? conversation.otherUser.username ?? "Someone";
            const avatarUrl = conversation.otherUser.avatarUrl ?? undefined;
            const last = conversation.lastMessage;
            const previewText = last
              ? previewLabel(last, last.fromMe)
              : "No messages yet";
            const timestamp = last?.createdAt
              ? formatTime(last.createdAt)
              : "";

            return (
              <li
                key={conversation.id}
                className={[
                  "conv-list__item",
                  isActive ? "conv-list__item--active" : "",
                  conversation.archived ? "conv-list__item--archived" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className="conv-list__row"
                  onClick={() => handleSelect(conversation.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onMenu) onMenu(conversation.id);
                  }}
                >
                  <div className="conv-list__avatar">
                    <Avatar src={avatarUrl} name={displayName} size="md" />
                  </div>

                  <div className="conv-list__body">
                    <div className="conv-list__top">
                      <span className="conv-list__name">{displayName}</span>
                      {timestamp ? (
                        <time className="conv-list__time" dateTime={last?.createdAt}>
                          {timestamp}
                        </time>
                      ) : null}
                    </div>
                    <div className="conv-list__bottom">
                      <span className="conv-list__preview">{previewText}</span>
                      <div className="conv-list__icons">
                        {conversation.muted ? (
                          <span className="conv-list__badge conv-list__badge--muted" aria-label="Muted">
                            <Icon as={BellOffIcon} size={12} />
                          </span>
                        ) : null}
                        {conversation.pinned ? (
                          <span className="conv-list__badge conv-list__badge--pin" aria-label="Pinned">
                            <Icon as={PinIcon} size={12} />
                          </span>
                        ) : null}
                        {!conversation.muted && conversation.unreadCount > 0 ? (
                          <span className="conv-list__unread">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>

                <div className="conv-list__menu-wrap" ref={menuRef}>
                  <button
                    type="button"
                    className="conv-list__menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpen ? null : conversation.id);
                    }}
                    aria-label="Conversation options"
                  >
                    <Icon as={MoreVerticalIcon} size={16} />
                  </button>

                  {menuOpen ? (
                    <div className="conv-list__menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenu?.(conversation.id, "pin");
                          setMenuOpenId(null);
                        }}
                      >
                        <MenuIcon action="pin" />
                        {conversation.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenu?.(conversation.id, "mute");
                          setMenuOpenId(null);
                        }}
                      >
                        <MenuIcon action="mute" />
                        {conversation.muted ? "Unmute" : "Mute"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenu?.(conversation.id, "archive");
                          setMenuOpenId(null);
                        }}
                      >
                        <MenuIcon action="archive" />
                        {conversation.archived ? "Unarchive" : "Archive"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="conv-list__menu-item--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenu?.(conversation.id, "delete");
                          setMenuOpenId(null);
                        }}
                      >
                        <MenuIcon action="delete" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
