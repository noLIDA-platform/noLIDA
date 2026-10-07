/**
 * Client-safe messaging shapes (Phase 10).
 *
 * View types only — no SQL rows, no column names. The service assembles
 * these from the repositories; components consume them; nothing below the
 * service layer knows how a row is stored.
 */

export interface MessagingUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export type AttachmentKind = "image" | "file";

export interface MessageAttachment {
  url: string;
  kind: AttachmentKind;
  /** Display name only — the filename the sender picked. */
  name: string;
  /** Bytes, as reported at upload time. */
  size: number;
}

export interface VoiceNote {
  url: string;
  /** Duration in milliseconds, measured by the recorder. */
  duration: number;
}

export type SharedItemType = "post" | "business" | "product" | "request";

export interface SharedItem {
  type: SharedItemType;
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  /** In-app destination, built by the server from the real slug/id. */
  href: string;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  mine: boolean;
}

/** What the reply chip shows, including for a message the other side deleted. */
export interface ReplyPreview {
  id: string;
  senderId: string;
  senderName: string;
  /** Text, or a kind word like "Photo" when there is no body to quote. */
  preview: string;
  deleted: boolean;
}

export type MessageStatus = "SENT" | "DELETED";

export interface MessageView {
  id: string;
  conversationId: string;
  sender: MessagingUser;
  body: string | null;
  attachments: MessageAttachment[];
  voiceNote: VoiceNote | null;
  sharedItem: SharedItem | null;
  replyTo: ReplyPreview | null;
  forwarded: boolean;
  status: MessageStatus;
  editedAt: string | null;
  createdAt: string;
  reactions: MessageReactionSummary[];
  /** True when the other member's read pointer has passed this message. */
  readByOther: boolean;
}

export interface MessagePage {
  items: MessageView[];
  nextCursor: string | null;
  /** User ids currently typing, excluding the viewer. */
  typingUserIds: string[];
}

export type ConversationPreviewKind =
  | "TEXT"
  | "IMAGE"
  | "FILE"
  | "VOICE"
  | "SHARE"
  | "DELETED";

export interface ConversationPreview {
  id: string;
  kind: ConversationPreviewKind;
  /** One-line summary for the list row, built server-side. */
  text: string;
  createdAt: string;
  fromMe: boolean;
}

export interface ConversationView {
  id: string;
  otherUser: MessagingUser;
  lastMessage: ConversationPreview | null;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** The viewer has blocked this person. */
  blocked: boolean;
  /** This person has blocked the viewer. */
  blockedByOther: boolean;
  /** The other person is typing right now (expiry handled server-side). */
  typing: boolean;
  createdAt: string;
}

export interface ConversationPage {
  items: ConversationView[];
  nextCursor: string | null;
}

export interface ConversationDetailView {
  conversation: ConversationView;
}

/** One search hit inside a conversation. */
export interface MessageSearchHit {
  message: MessageView;
  /** Message body with the match wrapped, HTML-escaped, for safe highlight. */
  snippetHtml: string;
}
