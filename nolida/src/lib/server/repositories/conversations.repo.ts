import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";

type Db = Pick<PoolClient, "query">;

/**
 * A message counts as read for the other person once the pair
 * (m.created_at, m.id) is <= their pointer. When a member has never opened
 * the conversation the pointer is the member row itself, so the comparison
 * uses the zero uuid — every real uuid is greater, so an unread message
 * never falsely counts as read, even when the first message shares the
 * conversation's own NOW() timestamp inside one transaction.
 */
export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export interface ConversationRow {
  id: string;
  user_a: string;
  user_b: string;
  last_message_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMemberRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
}

/** One joined row from the viewer's conversation list. */
export interface ConversationListRow {
  id: string;
  last_message_at: string;
  created_at: string;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  other_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
  last_id: string | null;
  last_body: string | null;
  last_attachments: unknown;
  last_voice_note: unknown;
  last_shared_item: unknown;
  last_status: string | null;
  last_sender_id: string | null;
  last_created_at: string | null;
  unread_count: number;
  other_typing: boolean;
  blocked: boolean;
  blocked_by_other: boolean;
}

export interface ConversationListPage {
  rows: ConversationListRow[];
  nextCursor: string | null;
}

/**
 * The conversation list: joined to the other member, their profile, the
 * preview message, a live typing flag, block state and an unread count — all
 * in ONE query. A second round-trip per conversation is how a list becomes
 * slow the moment it has content. Per-message visibility (`deleted_for`) is
 * applied inside the unread subquery, never by filtering the page after
 * loading it.
 */
const SELECT_LIST = `
  SELECT
    c.id, c.last_message_at, c.created_at,
    cm.pinned, cm.muted, cm.archived,
    om.user_id AS other_id,
    pr.username AS other_username,
    pr.display_name AS other_display_name,
    pr.full_name AS other_full_name,
    pr.avatar_url AS other_avatar_url,
    lm.id AS last_id,
    lm.body AS last_body,
    lm.attachments AS last_attachments,
    lm.voice_note AS last_voice_note,
    lm.shared_item AS last_shared_item,
    lm.status AS last_status,
    lm.sender_id AS last_sender_id,
    lm.created_at AS last_created_at,
    COALESCE((
      SELECT count(*) FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> cm.user_id
        AND m.status = 'SENT'
        AND NOT (cm.user_id = ANY(m.deleted_for))
        AND (m.created_at, m.id) > (
          cm.last_read_at,
          COALESCE(cm.last_read_message_id, '${ZERO_UUID}'::uuid)
        )
    ), 0)::int AS unread_count,
    (ts.user_id IS NOT NULL) AS other_typing,
    (ub.blocker_id IS NOT NULL) AS blocked,
    (ub2.blocker_id IS NOT NULL) AS blocked_by_other
  FROM conversation_members cm
  JOIN conversations c ON c.id = cm.conversation_id
  LEFT JOIN conversation_members om
    ON om.conversation_id = c.id AND om.user_id <> cm.user_id
  LEFT JOIN profiles pr ON pr.user_id = om.user_id
  LEFT JOIN messages lm ON lm.id = c.last_message_id
  LEFT JOIN typing_status ts
    ON ts.conversation_id = c.id
   AND ts.user_id = om.user_id
   AND ts.expires_at > now()
  LEFT JOIN user_blocks ub
    ON ub.blocker_id = cm.user_id AND ub.blocked_id = om.user_id
  LEFT JOIN user_blocks ub2
    ON ub2.blocker_id = om.user_id AND ub2.blocked_id = cm.user_id
  WHERE cm.user_id = $1
`;

/**
 * Find or create the canonical conversation between two users.
 *
 * The insert is ON CONFLICT DO NOTHING on the (user_a, user_b) unique pair,
 * and the row is always re-selected — two devices starting a chat at once
 * both come away with the same id. Callers pass the pair already ordered
 * (user_a < user_b); the CHECK constraint refuses anything else.
 */
export async function findOrCreatePair(
  input: { userA: string; userB: string },
  db?: Db
): Promise<ConversationRow> {
  const text = `
    INSERT INTO conversations (user_a, user_b)
    VALUES ($1, $2)
    ON CONFLICT (user_a, user_b) DO NOTHING
    RETURNING id, user_a, user_b, last_message_id, last_message_at,
              created_at, updated_at
  `;
  let result;
  if (db) result = await db.query<ConversationRow>(text, [input.userA, input.userB]);
  else result = await query<ConversationRow>(text, [input.userA, input.userB]);
  const inserted = result.rows[0];
  if (inserted) return inserted;

  // The conflict path: someone (this caller a moment ago, or another device)
  // already owns the pair. Re-select it.
  const selectText = `SELECT id, user_a, user_b, last_message_id, last_message_at,
                             created_at, updated_at
                      FROM conversations
                      WHERE user_a = $1 AND user_b = $2`;
  const selected = db
    ? await db.query<ConversationRow>(selectText, [input.userA, input.userB])
    : await query<ConversationRow>(selectText, [input.userA, input.userB]);
  const row = selected.rows[0];
  if (!row) throw new Error("conversations.repo.findOrCreatePair returned no row");
  return row;
}

/** Idempotent: creates any missing member rows, never touches existing ones. */
export async function ensureMembers(
  input: { conversationId: string; userA: string; userB: string },
  db?: Db
): Promise<void> {
  const text = `
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES ($1, $2), ($1, $3)
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `;
  const params = [input.conversationId, input.userA, input.userB];
  if (db) await db.query(text, params);
  else await query(text, params);
}

export async function findById(
  id: string,
  db?: Db
): Promise<ConversationRow | null> {
  const text = `SELECT id, user_a, user_b, last_message_id, last_message_at,
                       created_at, updated_at
                FROM conversations WHERE id = $1`;
  const result = db
    ? await db.query<ConversationRow>(text, [id])
    : await query<ConversationRow>(text, [id]);
  return result.rows[0] ?? null;
}

export async function getMember(
  conversationId: string,
  userId: string,
  db?: Db
): Promise<ConversationMemberRow | null> {
  const text = `SELECT conversation_id, user_id, last_read_at,
                       last_read_message_id, pinned, muted, archived
                FROM conversation_members
                WHERE conversation_id = $1 AND user_id = $2`;
  const result = db
    ? await db.query<ConversationMemberRow>(text, [conversationId, userId])
    : await query<ConversationMemberRow>(text, [conversationId, userId]);
  return result.rows[0] ?? null;
}

/**
 * The viewer's conversation list, newest activity first, pinned hoisted.
 *
 * The cursor is the (last_message_at, id) pair. Ordering by pinned first
 * means a cursor boundary can cut a pinned row away from its page — accepted
 * deliberately: conversation lists that large are rare, and a stable
 * (last_message_at, id) cursor beats a cursor that has to encode a boolean.
 */
export async function listForUser(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
  includeArchived?: boolean;
}): Promise<ConversationListPage> {
  const decoded = decodeCursor(input.cursor);
  const result = await query<ConversationListRow>(
    `${SELECT_LIST}
       AND ($2::boolean OR cm.archived = FALSE)
       AND ($3::timestamptz IS NULL
            OR (c.last_message_at, c.id) < ($3::timestamptz, $4::uuid))
     ORDER BY cm.pinned DESC, c.last_message_at DESC, c.id DESC
     LIMIT $5`,
    [
      input.userId,
      input.includeArchived ?? false,
      decoded?.createdAt ?? null,
      decoded?.id ?? null,
      input.limit + 1,
    ]
  );

  const hasMore = result.rows.length > input.limit;
  const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeCursor({ created_at: last.last_message_at, id: last.id })
        : null,
  };
}

/** Points the conversation's preview at a freshly inserted message. */
export async function touchLastMessage(
  input: { conversationId: string; messageId: string; at: string },
  db?: Db
): Promise<void> {
  const text = `UPDATE conversations
                SET last_message_id = $2, last_message_at = $3
                WHERE id = $1`;
  const params = [input.conversationId, input.messageId, input.at];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * Recomputes the preview after a message disappears (deleted for everyone).
 *
 * When nothing SENT is left the conversation empties its preview instead of
 * pointing at a tombstone — a list row that says "This message was deleted"
 * is a row nobody asked to see.
 */
export async function recomputeLastMessage(
  conversationId: string,
  db?: Db
): Promise<void> {
  const text = `
    UPDATE conversations c SET
      last_message_id = (
        SELECT m.id FROM messages m
        WHERE m.conversation_id = c.id AND m.status = 'SENT'
        ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ),
      last_message_at = COALESCE((
        SELECT m.created_at FROM messages m
        WHERE m.conversation_id = c.id AND m.status = 'SENT'
        ORDER BY m.created_at DESC, m.id DESC LIMIT 1
      ), now())
    WHERE c.id = $1
  `;
  if (db) await db.query(text, [conversationId]);
  else await query(text, [conversationId]);
}

/**
 * Per-side settings: pinned, muted, archived. Column allow-list — a surprise
 * key in the body is dropped rather than written, same rule as every update
 * in this codebase. Only the caller's own membership row is ever touched.
 */
const MEMBER_UPDATABLE = new Set(["pinned", "muted", "archived"]);

export async function updateMemberSettings(
  input: {
    conversationId: string;
    userId: string;
    fields: Partial<Pick<ConversationMemberRow, "pinned" | "muted" | "archived">>;
  },
  db?: Db
): Promise<ConversationMemberRow | null> {
  const entries = Object.entries(input.fields).filter(
    ([key, value]) => MEMBER_UPDATABLE.has(key) && typeof value === "boolean"
  );
  if (entries.length === 0) {
    return getMember(input.conversationId, input.userId, db);
  }

  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values: unknown[] = entries.map(([, value]) => value);
  const text = `UPDATE conversation_members
                SET ${sets.join(", ")}
                WHERE conversation_id = $${values.length + 1}
                  AND user_id = $${values.length + 2}
                RETURNING conversation_id, user_id, last_read_at,
                          last_read_message_id, pinned, muted, archived`;
  const result = db
    ? await db.query<ConversationMemberRow>(text, [
        ...values,
        input.conversationId,
        input.userId,
      ])
    : await query<ConversationMemberRow>(text, [
        ...values,
        input.conversationId,
        input.userId,
      ]);
  return result.rows[0] ?? null;
}
