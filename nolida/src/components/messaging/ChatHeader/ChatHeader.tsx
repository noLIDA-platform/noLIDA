"use client";

import type { ConversationView } from "@/lib/messaging/types";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Icon } from "@/components/ui/Icon/Icon";
import type { LucideIcon } from "lucide-react";
import {
  ArchiveIcon,
  BanIcon,
  BellOffIcon,
  ChevronLeftIcon,
  MoreVerticalIcon,
  SearchIcon,
  FlagIcon,
} from "@/components/ui/Icons";
import "./ChatHeader.css";

export interface ChatHeaderProps {
  conversation: ConversationView;
  onBack: () => void;
  onOpenMenu: (action: string) => void;
  onSearch: () => void;
}

export function ChatHeader({
  conversation,
  onBack,
  onOpenMenu,
  onSearch,
}: ChatHeaderProps): React.JSX.Element {
  const name =
    conversation.otherUser.displayName ?? conversation.otherUser.username ?? "Someone";
  const avatarUrl = conversation.otherUser.avatarUrl ?? undefined;
  const status = conversation.typing
    ? "typing…"
    : conversation.blockedByOther
      ? "Blocked"
      : conversation.blocked
        ? "You blocked this person"
        : "online";

  return (
    <header className="chat-header">
      <div className="chat-header__left">
        <button
          type="button"
          className="chat-header__back"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <Icon as={ChevronLeftIcon} size={20} />
        </button>

        <div className="chat-header__identity">
          <div className="chat-header__avatar">
            <Avatar src={avatarUrl} name={name} size="sm" />
          </div>
          <div className="chat-header__names">
            <span className="chat-header__name">{name}</span>
            <span
              className={[
                "chat-header__status",
                conversation.typing ? "chat-header__status--typing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      <div className="chat-header__right">
        <button
          type="button"
          className="chat-header__action"
          onClick={onSearch}
          aria-label="Search in conversation"
        >
          <Icon as={SearchIcon} size={18} />
        </button>

        <div className="chat-header__menu-wrap">
          <button
            type="button"
            className="chat-header__action"
            onClick={() => onOpenMenu("open")}
            aria-label="Conversation options"
            aria-expanded={false}
          >
            <Icon as={MoreVerticalIcon} size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export const CHAT_HEADER_MENU_ITEMS = [
  { id: "search", label: "Search in conversation", icon: SearchIcon },
  { id: "mute", label: "Mute", icon: BellOffIcon },
  { id: "block", label: "Block", icon: BanIcon },
  { id: "report", label: "Report", icon: FlagIcon },
  { id: "archive", label: "Archive", icon: ArchiveIcon },
] as const;
