/**
 * Messaging service (Phase 10).
 *
 * Everything about conversations and messages lives here: membership checks,
 * block checks, content rules, read pointers, forwards, reactions, typing,
 * reports. Repositories hold SQL; routes parse and respond; this file is the
 * only place that decides what is allowed.
 *
 * Two invariants the whole surface rests on:
 *
 * 1. A conversation you are not a member of is a 404 — never a 403 that
 *    confirms it exists. `requireMember` is the single gate.
 * 2. A block is checked in BOTH directions before any message is written.
 *    Otherwise blocking would only stop the blocked person, and the blocker
 *    would keep a one-way channel into someone who asked to be left alone.
 *
 * Realtime is a whisper, not a dependency: `publishConversationEvent` is a
 * no-op without Supabase env vars, and every write path works identically
 * either way — the client polls as the floor under every feature.
 */

import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db/client";
import { ServiceError } from "./service-error";
import * as conversationsRepo from "../repositories/conversations.repo";
import * as messagesRepo from "../repositories/messages.repo";
import * as receiptsRepo from "../repositories/messageReceipts.repo";
import * as reactionsRepo from "../repositories/messageReactions.repo";
import * as typingRepo from "../repositories/typingStatus.repo";
import * as blocksRepo from "../repositories/userBlocks.repo";
import * as reportsRepo from "../repositories/reports.repo";
import * as usersRepo from "../repositories/users.repo";
import * as profilesRepo from "../repositories/profiles.repo";
import * as postsRepo from "../repositories/posts.repo";
import * as businessesRepo from "../repositories/businesses.repo";
import * as productsRepo from "../repositories/products.repo";
import * as requestsRepo from "../repositories/requests.repo";
import { publishConversationEvent } from "../realtime/publish";
import { formatMinorPrice } from "@/lib/catalog/pricing";
import { formatMoney } from "@/lib/requests/constants";
import { EDIT_WINDOW_MS, SEARCH_PAGE_SIZE, TYPING_TTL_MS } from "@/lib/messaging/constants";
import type {
  ConversationPage,
  ConversationPreview,
  ConversationPreviewKind,
  ConversationView,
  MessageAttachment,
  MessagePage,
  MessageSearchHit,
  MessageView,
  ReplyPreview,
  SharedItem,
  SharedItemType,
  MessagingUser,
} from "@/lib/messaging/types";

type Db = Pick<PoolClient, "query">;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Body with the match wrapped in <mark>, escaped first — never raw HTML. */
function buildSnippet(body: string, q: string): string {
  const index = body.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return escapeHtml(truncate(body, 120));
  const start = Math.max(0, index - 40);
  const end = Math.min(body.length, index + q.length + 60);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < body.length ? "…" : "";
  return (
    prefix +
    escapeHtml(body.slice(start, index)) +
    "<mark>" +
    escapeHtml(body.slice(index, index + q.length)) +
    "</mark>" +
    escapeHtml(body.slice(index + q.length, end)) +
    suffix
  );
}

function isSharedItem(value: unknown): value is SharedItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.type === "string" &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.href === "string"
  );
}

/** https re-check at the mapper: stored URLs render into `src`, always. */
function safeHttps(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://")
    ? value
    : null;
}

/**
 * A joined message row → the client-safe view.
 *
 * A `DELETED` tombstone keeps its place in the thread and carries no content
 * — the UI renders "This message was deleted" and nothing else.
 */
export function mapMessage(row: messagesRepo.MessageJoinRow): MessageView {
  const deleted = row.status === "DELETED";
  const sender: MessagingUser = {
    id: row.sender.id,
    username: row.sender.username,
    displayName: row.sender.display_name ?? row.sender.full_name,
    avatarUrl: safeHttps(row.sender.avatar_url),
  };
  const rawAttachments = Array.isArray(row.attachments)
    ? (row.attachments as MessageAttachment[])
    : [];
  const attachments = deleted
    ? []
    : rawAttachments.filter(
        (item) =>
          item &&
          (item.kind === "image" || item.kind === "file") &&
          safeHttps(item.url) !== null
      );
  const rawVoice = row.voice_note as
    | { url?: unknown; duration?: unknown }
    | null;
  const voiceNote =
    !deleted &&
    rawVoice &&
    safeHttps(rawVoice.url) !== null &&
    typeof rawVoice.duration === "number" &&
    rawVoice.duration > 0
      ? { url: rawVoice.url as string, duration: rawVoice.duration }
      : null;
  const sharedItem =
    !deleted && isSharedItem(row.shared_item) ? row.shared_item : null;

  let replyTo: ReplyPreview | null = null;
  if (row.reply_exists && row.reply_to_id) {
    const replyGone =
      row.reply_deleted_for_me || row.reply_status === "DELETED";
    replyTo = {
      id: row.reply_to_id,
      senderId: row.reply_sender_id ?? "",
      senderName:
        row.reply_display_name ??
        row.reply_full_name ??
        row.reply_username ??
        "Message",
      preview: replyGone
        ? "Message deleted"
        : truncate(row.reply_body ?? "Attachment", 80),
      deleted: replyGone,
    };
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender,
    body: deleted ? null : row.body,
    attachments,
    voiceNote,
    sharedItem,
    replyTo,
    forwarded: row.forwarded,
    status: row.status,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    reactions: (row.reactions ?? []).map((reaction) => ({
      emoji: reaction.emoji,
      count: reaction.count,
      mine: reaction.mine,
    })),
    readByOther: row.read_by_other,
  };
}

function rowToOtherUser(row: {
  other_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
}): MessagingUser {
  return {
    id: row.other_id,
    username: row.other_username,
    displayName: row.other_display_name ?? row.other_full_name,
    avatarUrl: safeHttps(row.other_avatar_url),
  };
}

/** The one-line preview a conversation row shows, from raw list columns. */
function previewFromListRow(
  row: conversationsRepo.ConversationListRow,
  viewerId: string
): ConversationPreview | null {
  if (!row.last_id || !row.last_created_at) return null;
  const fromMe = row.last_sender_id === viewerId;
  const base = { id: row.last_id, createdAt: row.last_created_at, fromMe };
  if (row.last_status === "DELETED") {
    return { ...base, kind: "DELETED", text: "This message was deleted" };
  }
  if (isSharedItem(row.last_shared_item)) {
    return {
      ...base,
      kind: "SHARE",
      text: `Shared: ${truncate(row.last_shared_item.title, 60)}`,
    };
  }
  const voice = row.last_voice_note as { url?: unknown } | null;
  if (voice && safeHttps(voice.url) !== null) {
    return { ...base, kind: "VOICE", text: "Voice note" };
  }
  const attachments = Array.isArray(row.last_attachments)
    ? (row.last_attachments as MessageAttachment[])
    : [];
  if (attachments.length > 0) {
    const first = attachments[0];
    const kind: ConversationPreviewKind =
      first.kind === "image" ? "IMAGE" : "FILE";
    return {
      ...base,
      kind,
      text: kind === "IMAGE" ? "Photo" : truncate(first.name, 60),
    };
  }
  return {
    ...base,
    kind: "TEXT",
    text: truncate(row.last_body ?? "", 80),
  };
}

function previewFromMessage(
  message: MessageView,
  viewerId: string
): ConversationPreview {
  const base = {
    id: message.id,
    createdAt: message.createdAt,
    fromMe: message.sender.id === viewerId,
  };
  if (message.status === "DELETED") {
    return { ...base, kind: "DELETED", text: "This message was deleted" };
  }
  if (message.sharedItem) {
    return {
      ...base,
      kind: "SHARE",
      text: `Shared: ${truncate(message.sharedItem.title, 60)}`,
    };
  }
  if (message.voiceNote) return { ...base, kind: "VOICE", text: "Voice note" };
  if (message.attachments.length > 0) {
    const first = message.attachments[0];
    return {
      ...base,
      kind: first.kind === "image" ? "IMAGE" : "FILE",
      text: first.kind === "image" ? "Photo" : truncate(first.name, 60),
    };
  }
  return {
    ...base,
    kind: "TEXT",
    text: truncate(message.body ?? "", 80),
  };
}

/**
 * The membership gate. Not a member (or no such conversation) is a 404 —
 * never a 403 that would confirm the conversation exists.
 */
async function requireMember(
  conversationId: string,
  userId: string,
  db?: Db
): Promise<conversationsRepo.ConversationMemberRow> {
  const member = await conversationsRepo.getMember(conversationId, userId, db);
  if (!member) {
    throw new ServiceError("NOT_FOUND", "That conversation was not found.");
  }
  return member;
}

/**
 * Assemble the conversation view for one member: the other person, their
 * profile, block state in both directions, live typing, the preview and the
 * per-side settings.
 *
 * `unreadCount` is always 0 here on purpose. This view serves the thread
 * page, which marks the conversation read the moment it opens; a count that
 * is already stale by the time it renders would be decoration, and the list
 * page — where the number matters — computes it in SQL.
 */
async function conversationViewFor(
  conversationId: string,
  userId: string
): Promise<ConversationView> {
  const conversation = await conversationsRepo.findById(conversationId);
  const member = await conversationsRepo.getMember(conversationId, userId);
  if (!conversation || !member) {
    throw new ServiceError("NOT_FOUND", "That conversation was not found.");
  }
  const otherId =
    conversation.user_a === userId ? conversation.user_b : conversation.user_a;
  const profile = await profilesRepo.findByUserId(otherId);
  const blocks = await blocksRepo.getBetween(userId, otherId);
  const typingUserIds = await typingRepo.listActiveUserIds({
    conversationId,
    excludeUserId: userId,
  });

  let lastMessage: ConversationPreview | null = null;
  if (conversation.last_message_id) {
    const last = await messagesRepo.findByIdForViewer(
      conversation.last_message_id,
      userId
    );
    if (last) lastMessage = previewFromMessage(mapMessage(last), userId);
  }

  return {
    id: conversation.id,
    otherUser: {
      id: otherId,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? profile?.full_name ?? null,
      avatarUrl: safeHttps(profile?.avatar_url),
    },
    lastMessage,
    unreadCount: 0,
    pinned: member.pinned,
    muted: member.muted,
    archived: member.archived,
    blocked: blocks.blocked_by_me,
    blockedByOther: blocks.blocked_by_other,
    typing: typingUserIds.length > 0,
    createdAt: conversation.created_at,
  };
}

/**
 * Derive a shared item's display fields from the DATABASE, never from the
 * client. The client sends `{ type, id }`; this builds the title, subtitle,
 * image and in-app href from the real row, applying the same visibility a
 * page would: a post through `findForViewer`, a business or product only at
 * status APPROVED, a request only if it exists.
 */
async function buildSharedItem(input: {
  type: SharedItemType;
  id: string;
  viewerId: string;
}): Promise<SharedItem> {
  const { type, id, viewerId } = input;

  if (type === "post") {
    const post = await postsRepo.findForViewer(id, viewerId);
    if (!post) {
      throw new ServiceError("NOT_FOUND", "That post is no longer available.");
    }
    const media = Array.isArray(post.media)
      ? (post.media as { url?: unknown }[])
      : [];
    const imageUrl =
      media
        .map((item) => safeHttps(item?.url))
        .find((url): url is string => url !== null) ?? null;
    return {
      type,
      id,
      title: truncate(post.body || "Post", 80),
      subtitle:
        post.author.display_name ??
        post.author.full_name ??
        post.author.username ??
        null,
      imageUrl,
      href: `/post/${id}`,
    };
  }

  if (type === "business") {
    const business = await businessesRepo.findById(id);
    if (!business || business.status !== "APPROVED") {
      throw new ServiceError(
        "NOT_FOUND",
        "That business is no longer available."
      );
    }
    // photos is legacy '[]' or Phase 5C { cover, logo, gallery } — read only
    // what this card needs and tolerate both shapes.
    const photos = business.photos as { cover?: unknown } | unknown[] | null;
    const cover =
      photos && !Array.isArray(photos) && typeof photos === "object"
        ? (photos as { cover?: unknown }).cover
        : null;
    return {
      type,
      id,
      title: business.name,
      subtitle: business.category ?? null,
      imageUrl: safeHttps(cover),
      href: `/business/${business.slug}`,
    };
  }

  if (type === "product") {
    const product = await productsRepo.findById(id);
    if (!product) {
      throw new ServiceError(
        "NOT_FOUND",
        "That product is no longer available."
      );
    }
    const business = await businessesRepo.findById(product.business_id);
    if (!business || business.status !== "APPROVED") {
      throw new ServiceError(
        "NOT_FOUND",
        "That product is no longer available."
      );
    }
    const images = Array.isArray(product.images)
      ? (product.images as unknown[])
      : [];
    const imageUrl =
      images
        .map((url) => safeHttps(url))
        .find((url): url is string => url !== null) ?? null;
    return {
      type,
      id,
      title: product.name,
      // Products are minor units; this is the formatter the catalog UI uses.
      subtitle: formatMinorPrice(product.price, product.currency),
      imageUrl,
      href: `/business/${business.slug}`,
    };
  }

  const request = await requestsRepo.findById(id);
  if (!request) {
    throw new ServiceError("NOT_FOUND", "That request is no longer available.");
  }
  const attachments = Array.isArray(request.attachments)
    ? (request.attachments as { url?: unknown }[])
    : [];
  const imageUrl =
    attachments
      .map((item) => safeHttps(item?.url))
      .find((url): url is string => url !== null) ?? null;
  const budget =
    request.budget_min != null
      ? formatMoney(request.budget_min, request.currency ?? "NGN")
      : request.budget_max != null
        ? `Up to ${formatMoney(request.budget_max, request.currency ?? "NGN")}`
        : "Budget on request";
  return {
    type,
    id,
    title: request.title,
    subtitle: budget,
    imageUrl,
    href: `/requests/${id}`,
  };
}

/* ------------------------------------------------------------------ */
/* Conversations                                                        */
/* ------------------------------------------------------------------ */

export async function listConversations(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
  includeArchived?: boolean;
}): Promise<ConversationPage> {
  const page = await conversationsRepo.listForUser(input);
  return {
    items: page.rows.map((row) => ({
      id: row.id,
      otherUser: rowToOtherUser(row),
      lastMessage: previewFromListRow(row, input.userId),
      unreadCount: row.unread_count,
      pinned: row.pinned,
      muted: row.muted,
      archived: row.archived,
      blocked: row.blocked,
      blockedByOther: row.blocked_by_other,
      typing: row.other_typing,
      createdAt: row.created_at,
    })),
    nextCursor: page.nextCursor,
  };
}

/**
 * Start (or find) the conversation with another person.
 *
 * The pair is canonicalised — user_a < user_b — so exactly one row can ever
 * exist between two people, no matter which of them taps "Message" first.
 * The insert, the member rows and the audit-free bookkeeping share one
 * transaction: a conversation with one member row is a half-built object.
 */
export async function startConversation(input: {
  userId: string;
  otherUserId: string;
}): Promise<ConversationView> {
  const { userId, otherUserId } = input;
  if (userId === otherUserId) {
    throw new ServiceError("INVALID", "You cannot message yourself.");
  }

  const other = await usersRepo.findById(otherUserId);
  if (!other || other.status !== "ACTIVE") {
    throw new ServiceError("NOT_FOUND", "That person could not be found.");
  }

  const blocks = await blocksRepo.getBetween(userId, otherUserId);
  if (blocks.blocked_by_me) {
    throw new ServiceError(
      "FORBIDDEN",
      "You have blocked this person. Unblock them first."
    );
  }
  if (blocks.blocked_by_other) {
    throw new ServiceError(
      "INVALID",
      "You cannot start a conversation with this person."
    );
  }

  const [userA, userB] =
    userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

  const conversation = await withTransaction(async (client) => {
    const row = await conversationsRepo.findOrCreatePair(
      { userA, userB },
      client
    );
    await conversationsRepo.ensureMembers(
      { conversationId: row.id, userA, userB },
      client
    );
    return row;
  });

  return conversationViewFor(conversation.id, userId);
}

export async function getConversation(input: {
  userId: string;
  conversationId: string;
}): Promise<ConversationView> {
  await requireMember(input.conversationId, input.userId);
  return conversationViewFor(input.conversationId, input.userId);
}

/** Per-side settings: pin, mute, archive. Each side owns only their row. */
export async function updateConversationSettings(input: {
  userId: string;
  conversationId: string;
  fields: Partial<Pick<conversationsRepo.ConversationMemberRow, "pinned" | "muted" | "archived">>;
}): Promise<ConversationView> {
  await requireMember(input.conversationId, input.userId);
  const updated = await conversationsRepo.updateMemberSettings({
    conversationId: input.conversationId,
    userId: input.userId,
    fields: input.fields,
  });
  if (!updated) {
    throw new ServiceError("NOT_FOUND", "That conversation was not found.");
  }
  return conversationViewFor(input.conversationId, input.userId);
}

/* ------------------------------------------------------------------ */
/* Messages: reads                                                      */
/* ------------------------------------------------------------------ */

/**
 * One page of a thread, oldest-first for rendering.
 *
 * The repository pages newest-first (the chat opens on the newest page and
 * loads history upward); `items` is reversed here so the client renders top
 * to bottom without doing ordering arithmetic. The cursor keeps the
 * repository's newest-first semantics — "load earlier" passes it back and
 * the next page arrives above the current one.
 */
export async function listMessages(input: {
  userId: string;
  conversationId: string;
  limit: number;
  cursor?: string | null;
}): Promise<MessagePage> {
  await requireMember(input.conversationId, input.userId);
  const page = await messagesRepo.listPage({
    conversationId: input.conversationId,
    viewerId: input.userId,
    limit: input.limit,
    cursor: input.cursor,
  });
  const typingUserIds = await typingRepo.listActiveUserIds({
    conversationId: input.conversationId,
    excludeUserId: input.userId,
  });
  return {
    items: page.rows.map(mapMessage).reverse(),
    nextCursor: page.nextCursor,
    typingUserIds,
  };
}

/**
 * Search inside ONE conversation. Newest matches first, one capped page —
 * the match itself is highlighted server-side from an escaped body, so the
 * client renders the snippet without ever interpreting raw HTML.
 */
export async function searchMessages(input: {
  userId: string;
  conversationId: string;
  q: string;
  limit?: number;
}): Promise<MessageSearchHit[]> {
  await requireMember(input.conversationId, input.userId);
  const escaped = input.q.replace(/[\\%_]/g, (char) => `\\${char}`);
  const rows = await messagesRepo.searchPage({
    conversationId: input.conversationId,
    viewerId: input.userId,
    escapedPattern: `%${escaped}%`,
    limit: input.limit ?? SEARCH_PAGE_SIZE,
  });
  return rows.map((row) => ({
    message: mapMessage(row),
    snippetHtml: buildSnippet(row.body ?? "", input.q),
  }));
}

/* ------------------------------------------------------------------ */
/* Messages: writes                                                     */
/* ------------------------------------------------------------------ */

/**
 * Send a message.
 *
 * Content rule (enforced here as well as by zod and the DB CHECK): a message
 * carries a body, attachments, a voice note, or a shared item — never
 * nothing. A shared item is DERIVED server-side from `{ type, id }`; a
 * reply must exist, be in this conversation, and be visible to the sender.
 * The insert and the conversation's preview move in ONE transaction.
 */
export async function sendMessage(input: {
  userId: string;
  conversationId: string;
  body?: string;
  attachments?: {
    url: string;
    kind: "image" | "file";
    name: string;
    size: number;
  }[];
  voiceNote?: { url: string; duration: number };
  sharedItem?: { type: SharedItemType; id: string };
  replyToId?: string;
}): Promise<MessageView> {
  const { userId, conversationId } = input;
  const body = input.body?.trim() ? input.body.trim() : null;
  const attachments = input.attachments ?? [];
  const voiceNote = input.voiceNote ?? null;

  if (!body && attachments.length === 0 && !voiceNote && !input.sharedItem) {
    throw new ServiceError("INVALID", "A message needs something in it.");
  }
  if (attachments.length > 4) {
    throw new ServiceError("INVALID", "A message can carry up to 4 attachments.");
  }

  // Shared items are derived here, OUTSIDE the transaction: building one
  // reads posts/businesses/products/requests through their own repositories,
  // and a transaction should hold locks for its own writes only.
  const sharedItem = input.sharedItem
    ? await buildSharedItem({
        type: input.sharedItem.type,
        id: input.sharedItem.id,
        viewerId: userId,
      })
    : null;

  const message = await withTransaction(async (client) => {
    await requireMember(conversationId, userId, client);
    const conversation = await conversationsRepo.findById(conversationId, client);
    if (!conversation) {
      throw new ServiceError("NOT_FOUND", "That conversation was not found.");
    }
    const otherId =
      conversation.user_a === userId
        ? conversation.user_b
        : conversation.user_a;
    const blocks = await blocksRepo.getBetween(userId, otherId, client);
    if (blocks.blocked_by_me) {
      throw new ServiceError(
        "INVALID",
        "You have blocked this person. Unblock them to send messages."
      );
    }
    if (blocks.blocked_by_other) {
      throw new ServiceError(
        "INVALID",
        "You cannot send messages to this person."
      );
    }

    if (input.replyToId) {
      const target = await messagesRepo.findByIdForViewer(
        input.replyToId,
        userId,
        client
      );
      if (!target || target.conversation_id !== conversationId) {
        throw new ServiceError(
          "NOT_FOUND",
          "The message you are replying to is no longer available."
        );
      }
    }

    const row = await messagesRepo.insert(
      {
        conversationId,
        senderId: userId,
        body,
        attachments,
        voiceNote,
        sharedItem,
        replyToId: input.replyToId ?? null,
        forwarded: false,
      },
      client
    );
    await conversationsRepo.touchLastMessage(
      { conversationId, messageId: row.id, at: row.created_at },
      client
    );
    const full = await messagesRepo.findByIdForViewer(row.id, userId, client);
    if (!full) {
      throw new Error(
        "sendMessage: row vanished inside its own transaction"
      );
    }
    return mapMessage(full);
  });

  // Whisper AFTER the commit: a subscriber that refetches immediately must
  // find the row, not race it.
  void publishConversationEvent(conversationId, "message", {
    messageId: message.id,
    senderId: userId,
  });
  return message;
}

/**
 * Edit a body — the sender only, within the edit window, SENT messages only.
 * An edit past the window is not a slower save, it is history rewriting.
 */
export async function editMessage(input: {
  userId: string;
  messageId: string;
  body: string;
}): Promise<MessageView> {
  const row = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!row) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  if (row.sender_id !== input.userId) {
    throw new ServiceError(
      "FORBIDDEN",
      "You can only edit your own messages."
    );
  }
  if (row.status !== "SENT") {
    throw new ServiceError("INVALID", "That message was deleted.");
  }
  const age = Date.now() - Date.parse(row.created_at);
  if (age > EDIT_WINDOW_MS) {
    throw new ServiceError(
      "INVALID",
      "Messages can only be edited for a short time after sending."
    );
  }

  const body = input.body.trim();
  if (!body) throw new ServiceError("INVALID", "A message needs something in it.");

  const updated = await messagesRepo.updateBody({
    id: input.messageId,
    body,
    editedAt: new Date().toISOString(),
  });
  if (!updated) {
    throw new ServiceError("INVALID", "That message could not be edited.");
  }
  const full = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!full) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  void publishConversationEvent(row.conversation_id, "message", {
    messageId: row.id,
    senderId: input.userId,
  });
  return mapMessage(full);
}

/**
 * Delete a message.
 *
 * "me" removes it from the caller's view only — the other person keeps
 * their copy, exactly like a phone that deletes its own history. "everyone"
 * is the sender's alone and tombstones the row in one transaction with its
 * reactions and the conversation's recomputed preview. Deleting someone
 * else's message "for everyone" is a 403 that changes nothing.
 */
export async function deleteMessage(input: {
  userId: string;
  messageId: string;
  scope: "me" | "everyone";
}): Promise<{ deleted: true; scope: "me" | "everyone" }> {
  const row = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!row) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }

  if (input.scope === "everyone") {
    if (row.sender_id !== input.userId) {
      throw new ServiceError(
        "FORBIDDEN",
        "Only the sender can delete a message for everyone."
      );
    }
    if (row.status === "DELETED") {
      return { deleted: true, scope: "everyone" };
    }
    const conversationId = row.conversation_id;
    await withTransaction(async (client) => {
      const tombstoned = await messagesRepo.softDeleteForEveryone(
        input.messageId,
        client
      );
      if (!tombstoned) return;
      await messagesRepo.removeReactions(input.messageId, client);
      await conversationsRepo.recomputeLastMessage(conversationId, client);
    });
    void publishConversationEvent(conversationId, "message", {
      messageId: input.messageId,
      deleted: true,
    });
    return { deleted: true, scope: "everyone" };
  }

  await messagesRepo.markDeletedFor({ id: input.messageId, viewerId: input.userId });
  return { deleted: true, scope: "me" };
}

/* ------------------------------------------------------------------ */
/* Reactions, forwards, receipts, typing                                 */
/* ------------------------------------------------------------------ */

/**
 * React to a message. The emoji comes from the fixed set in constants —
 * the PK on (message_id, user_id) makes a second reaction an UPDATE, never
 * a duplicate row, so there is no read-then-write to race.
 */
export async function addReaction(input: {
  userId: string;
  messageId: string;
  emoji: string;
}): Promise<MessageView> {
  const row = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!row) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  await reactionsRepo.add({
    messageId: input.messageId,
    userId: input.userId,
    emoji: input.emoji,
  });
  const full = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!full) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  void publishConversationEvent(row.conversation_id, "message", {
    messageId: input.messageId,
  });
  return mapMessage(full);
}

/** Remove your reaction. Idempotent — removing nothing is a success. */
export async function removeReaction(input: {
  userId: string;
  messageId: string;
}): Promise<MessageView> {
  const row = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!row) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  await reactionsRepo.remove({
    messageId: input.messageId,
    userId: input.userId,
  });
  const full = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!full) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  void publishConversationEvent(row.conversation_id, "message", {
    messageId: input.messageId,
  });
  return mapMessage(full);
}

/**
 * Forward a message into other conversations.
 *
 * The copy keeps body, attachments, voice note and shared item, drops the
 * reply chain (a reply that jumps threads is nonsense) and is flagged
 * `forwarded` so the receiver can see it travelled. Every target is checked
 * for membership and blocks inside ONE transaction — a forward is only
 * useful if all of its copies land together.
 */
export async function forwardMessage(input: {
  userId: string;
  messageId: string;
  conversationIds: string[];
}): Promise<{ forwarded: number; conversationIds: string[] }> {
  const source = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!source || source.status !== "SENT") {
    throw new ServiceError("NOT_FOUND", "That message is no longer available.");
  }

  const targets = Array.from(new Set(input.conversationIds));
  if (targets.length === 0) {
    throw new ServiceError("INVALID", "Choose at least one conversation.");
  }
  if (targets.length > 5) {
    throw new ServiceError(
      "INVALID",
      "A message can be forwarded to up to 5 conversations."
    );
  }

  await withTransaction(async (client) => {
    for (const conversationId of targets) {
      await requireMember(conversationId, input.userId, client);
      const conversation = await conversationsRepo.findById(
        conversationId,
        client
      );
      if (!conversation) {
        throw new ServiceError("NOT_FOUND", "A conversation was not found.");
      }
      const otherId =
        conversation.user_a === input.userId
          ? conversation.user_b
          : conversation.user_a;
      const blocks = await blocksRepo.getBetween(
        input.userId,
        otherId,
        client
      );
      if (blocks.blocked_by_me || blocks.blocked_by_other) {
        throw new ServiceError(
          "INVALID",
          "A message cannot be forwarded into a blocked conversation."
        );
      }

      const copied = await messagesRepo.insert(
        {
          conversationId,
          senderId: input.userId,
          body: source.body,
          attachments: (source.attachments ?? []) as unknown[],
          voiceNote: source.voice_note,
          sharedItem: source.shared_item ?? null,
          replyToId: null,
          forwarded: true,
        },
        client
      );
      await conversationsRepo.touchLastMessage(
        { conversationId, messageId: copied.id, at: copied.created_at },
        client
      );
    }
  });

  for (const conversationId of targets) {
    void publishConversationEvent(conversationId, "message", {
      senderId: input.userId,
    });
  }
  return { forwarded: targets.length, conversationIds: targets };
}

/**
 * Advance the caller's read pointer to the conversation's newest message.
 * Moving a pointer backwards is impossible by construction: the repo takes
 * GREATEST on the timestamp, so a late request from an old tab cannot
 * un-read what a newer tab already cleared.
 */
export async function markConversationRead(input: {
  userId: string;
  conversationId: string;
}): Promise<{ unreadCount: 0 }> {
  await requireMember(input.conversationId, input.userId);
  const conversation = await conversationsRepo.findById(input.conversationId);
  if (!conversation) {
    throw new ServiceError("NOT_FOUND", "That conversation was not found.");
  }
  if (!conversation.last_message_id) return { unreadCount: 0 };
  await receiptsRepo.markRead({
    conversationId: input.conversationId,
    userId: input.userId,
    lastReadMessageId: conversation.last_message_id,
    at: new Date().toISOString(),
  });
  void publishConversationEvent(input.conversationId, "read", {
    userId: input.userId,
  });
  return { unreadCount: 0 };
}

/**
 * Typing is an expiring flag, re-armed by the client while keys are down.
 * It never blocks a send and never errors: a missing row means "not
 * typing", full stop.
 */
export async function setTyping(input: {
  userId: string;
  conversationId: string;
  typing: boolean;
}): Promise<{ typing: boolean }> {
  await requireMember(input.conversationId, input.userId);
  if (input.typing) {
    const expiresAt = new Date(Date.now() + TYPING_TTL_MS).toISOString();
    await typingRepo.touch({
      conversationId: input.conversationId,
      userId: input.userId,
      expiresAt,
    });
    void publishConversationEvent(input.conversationId, "typing", {
      userId: input.userId,
    });
  } else {
    await typingRepo.clear({
      conversationId: input.conversationId,
      userId: input.userId,
    });
    void publishConversationEvent(input.conversationId, "typing", {
      userId: input.userId,
      stopped: true,
    });
  }
  return { typing: input.typing };
}

/* ------------------------------------------------------------------ */
/* Safety: reports and blocks                                            */
/* ------------------------------------------------------------------ */

/**
 * Report a message. The report records what was seen, never a verdict —
 * and never a hint about the target: the response is identical whether or
 * not they have been reported before.
 */
export async function reportMessage(input: {
  userId: string;
  messageId: string;
  reason: string;
  details?: string;
}): Promise<{ reported: true }> {
  const row = await messagesRepo.findByIdForViewer(
    input.messageId,
    input.userId
  );
  if (!row) {
    throw new ServiceError("NOT_FOUND", "That message was not found.");
  }
  await reportsRepo.create({
    reporterId: input.userId,
    reportedUserId: row.sender_id,
    conversationId: row.conversation_id,
    messageId: input.messageId,
    reason: input.reason,
    details: input.details ?? null,
  });
  return { reported: true };
}

/** Block someone. Idempotent; messaging in both directions stops. */
export async function blockUser(input: {
  userId: string;
  targetUserId: string;
}): Promise<{ blocked: true }> {
  if (input.userId === input.targetUserId) {
    throw new ServiceError("INVALID", "You cannot block yourself.");
  }
  const target = await usersRepo.findById(input.targetUserId);
  if (!target) {
    throw new ServiceError("NOT_FOUND", "That person could not be found.");
  }
  await blocksRepo.create({
    blockerId: input.userId,
    blockedId: input.targetUserId,
  });
  return { blocked: true };
}

export async function unblockUser(input: {
  userId: string;
  targetUserId: string;
}): Promise<{ blocked: false }> {
  await blocksRepo.remove({
    blockerId: input.userId,
    blockedId: input.targetUserId,
  });
  return { blocked: false };
}
