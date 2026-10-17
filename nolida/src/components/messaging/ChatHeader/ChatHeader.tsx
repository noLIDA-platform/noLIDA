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
  PhoneIcon,
  SearchIcon,
  FlagIcon,
  VideoIcon,
} from "@/components/ui/Icons";
import "./ChatHeader.css";

export interface ChatHeaderProps {
  conversation: ConversationView;
  onBack: () => void;
  onOpenMenu: (action: string) => void;
  onSearch: () => void;
  /** Tapping the identity opens the chat info screen (profile or group page). */
  onOpenInfo?: () => void;
}

export function ChatHeader({
  conversation,
  onBack,
  onOpenMenu,
  onSearch,
  onOpenInfo,
}: ChatHeaderProps): React.JSX.Element {
  const isGroup = conversation.type === "GROUP";
  const name = isGroup
    ? conversation.name ?? "Group"
    : conversation.otherUser.displayName ??
      conversation.otherUser.username ??
      "Someone";
  // A group's avatar is the cover photo the creator set; a 1:1 uses the person's.
  const avatarUrl =
    (isGroup ? conversation.avatarUrl : conversation.otherUser.avatarUrl) ??
    undefined;
  const status = conversation.typing
    ? "typing…"
    : isGroup
      ? `${conversation.memberCount} members`
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

        <button
          type="button"
          className="chat-header__identity"
          onClick={() => onOpenInfo?.()}
          aria-label={`Open info for ${name}`}
        >
          <span className="chat-header__avatar">
            <Avatar src={avatarUrl} name={name} size="sm" />
          </span>
          <span className="chat-header__names">
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
          </span>
        </button>
      </div>

      <div className="chat-header__right">
        {/* Voice/video calls are deferred to a later phase. The affordance is
            visible per the product spec but disabled so it can never pretend
            to work, and the tooltip sits on a WRAPPER because a disabled
            button never fires hover. */}
        <span className="chat-header__action-wrap" title="Calls coming soon">
          <button
            type="button"
            className="chat-header__action"
            disabled
            aria-label="Voice call (coming soon)"
          >
            <Icon as={PhoneIcon} size={18} />
          </button>
        </span>
        <span className="chat-header__action-wrap" title="Calls coming soon">
          <button
            type="button"
            className="chat-header__action"
            disabled
            aria-label="Video call (coming soon)"
          >
            <Icon as={VideoIcon} size={18} />
          </button>
        </span>

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
