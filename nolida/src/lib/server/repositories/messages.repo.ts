import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import { decodeCursor, encodeCursor } from "./cursor";
import { ZERO_UUID } from "./conversations.repo";

type Db = Pick<PoolClient, "query">;

/** Raw message columns, exactly as stored. */
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachments: unknown[] | null;
  voice_note: { url: string; duration: number } | null;
  shared_item: unknown;
  reply_to_id: string | null;
  forwarded: boolean;
  status: "SENT" | "DELETED";
  edited_at: string | null;
  deleted_for: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ReactionAgg {
  emoji: string;
  count: number;
  mine: boolean;
}

/** A message row with everything the view needs, assembled in SQL. */
export interface MessageJoinRow extends MessageRow {
  sender: {
    id: string;
    username: string | null;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_exists: boolean;
  reply_sender_id: string | null;
  reply_body: string | null;
  reply_status: string | null;
  reply_display_name: string | null;
  reply_full_name: string | null;
  reply_username: string | null;
  /** The reply target is deleted, or deleted for this viewer. */
  reply_deleted_for_me: boolean;
  reactions: ReactionAgg[];
  read_by_other: boolean;
}

export interface MessageListPage {
  rows: MessageJoinRow[];
  nextCursor: string | null;
}

/**
 * One message with its sender, reply preview, reactions and receipt state.
 *
 * The reactions are aggregated per emoji with a `mine` flag in the same
 * query — one `= ANY($1)` style round-trip per page, never one query per
 * message. `read_by_other` compares against the OTHER member's pointer
 * (the `om` join excludes the viewer).
 */
const SELECT_MESSAGE = `
  SELECT
    m.id, m.conversation_id, m.sender_id, m.body, m.attachments, m.voice_note,
    m.shared_item, m.reply_to_id, m.forwarded, m.status, m.edited_at,
    m.deleted_for, m.created_at, m.updated_at,
    jsonb_build_object(
      'id', u.id,
      'username', pr.username,
      'display_name', pr.display_name,
      'full_name', pr.full_name,
      'avatar_url', pr.avatar_url
    ) AS sender,
    (rm.id IS NOT NULL) AS reply_exists,
    rm.sender_id AS reply_sender_id,
    rm.body AS reply_body,
    rm.status AS reply_status,
    rpr.display_name AS reply_display_name,
    rpr.full_name AS reply_full_name,
    rpr.username AS reply_username,
    CASE WHEN rm.id IS NULL THEN FALSE
         ELSE ($2::uuid = ANY(COALESCE(rm.deleted_for, '{}'::uuid[])))
              OR rm.status = 'DELETED'
    END AS reply_deleted_for_me,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'emoji', agg.emoji, 'count', agg.cnt, 'mine', agg.mine))
      FROM (
        SELECT mr.emoji, count(*)::int AS cnt, bool_or(mr.user_id = $2) AS mine
        FROM message_reactions mr
        WHERE mr.message_id = m.id
        GROUP BY mr.emoji
      ) agg
    ), '[]'::jsonb) AS reactions,
    CASE WHEN om.last_read_at IS NULL THEN FALSE
         ELSE (m.created_at, m.id) <= (
           om.last_read_at,
           COALESCE(om.last_read_message_id, '${ZERO_UUID}'::uuid)
         )
    END AS read_by_other
  FROM messages m
  JOIN users u ON u.id = m.sender_id
  LEFT JOIN profiles pr ON pr.user_id = u.id
  LEFT JOIN messages rm ON rm.id = m.reply_to_id
  LEFT JOIN profiles rpr ON rpr.user_id = rm.sender_id
  LEFT JOIN conversation_members om
    ON om.conversation_id = m.conversation_id AND om.user_id <> $2
`;

/** The visibility predicate, applied in SQL — never by filtering a page later. */
const VISIBLE = `NOT ($2::uuid = ANY(COALESCE(m.deleted_for, '{}'::uuid[])))`;

/**
 * One page of a conversation, newest first.
 *
 * Newest-first is deliberate: the chat renders the newest page immediately
 * and older history loads upward behind a "load earlier" control, the same
 * cursor arithmetic as the feed — `limit + 1` rows, the extra row making
 * `nextCursor` honest.
 */
export async function listPage(input: {
  conversationId: string;
  viewerId: string;
  limit: number;
  cursor?: string | null;
}): Promise<MessageListPage> {
  const decoded = decodeCursor(input.cursor);
  const text = `${SELECT_MESSAGE}
    WHERE m.conversation_id = $1
      AND ${VISIBLE}
      AND ($3::timestamptz IS NULL
           OR (m.created_at, m.id) < ($3::timestamptz, $4::uuid))
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT $5
  `;
  const params = [
    input.conversationId,
    input.viewerId,
    decoded?.createdAt ?? null,
    decoded?.id ?? null,
    input.limit + 1,
  ];
  const result = await query<MessageJoinRow>(text, params);
  const hasMore = result.rows.length > input.limit;
  const rows = hasMore ? result.rows.slice(0, input.limit) : result.rows;
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeCursor({ created_at: last.created_at, id: last.id })
        : null,
  };
}

/**
 * Text search inside ONE conversation.
 *
 * ILIKE with a service-escaped pattern (the `%` and `_` in user text are
 * escaped before they reach here). A single capped page of the newest
 * matches, newest first — a message search that pages through the whole
 * history is a full scan wearing a UI.
 */
export async function searchPage(input: {
  conversationId: string;
  viewerId: string;
  escapedPattern: string;
  limit: number;
}): Promise<MessageJoinRow[]> {
  const text = `${SELECT_MESSAGE}
    WHERE m.conversation_id = $1
      AND ${VISIBLE}
      AND m.status = 'SENT'
      AND m.body ILIKE $3 ESCAPE '\\'
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT $4
  `;
  const params = [
    input.conversationId,
    input.viewerId,
    input.escapedPattern,
    input.limit,
  ];
  const result = await query<MessageJoinRow>(text, params);
  return result.rows;
}

/** One message, only if this viewer is allowed to see it. Null means 404. */
export async function findByIdForViewer(
  id: string,
  viewerId: string,
  db?: Db
): Promise<MessageJoinRow | null> {
  const text = `${SELECT_MESSAGE}
    WHERE m.id = $1 AND ${VISIBLE}
  `;
  const params = [id, viewerId];
  const result = db
    ? await db.query<MessageJoinRow>(text, params)
    : await query<MessageJoinRow>(text, params);
  return result.rows[0] ?? null;
}

/** Insert a message. JSONB columns arrive pre-stringified. */
export async function insert(
  input: {
    conversationId: string;
    senderId: string;
    body: string | null;
    attachments?: unknown[] | null;
    voiceNote?: { url: string; duration: number } | null;
    sharedItem?: unknown;
    replyToId?: string | null;
    forwarded?: boolean;
  },
  db?: Db
): Promise<MessageRow> {
  const text = `
    INSERT INTO messages (
      conversation_id, sender_id, body, attachments, voice_note, shared_item,
      reply_to_id, forwarded
    )
    VALUES ($1, $2, $3, COALESCE($4::jsonb, '[]'::jsonb), $5, $6, $7, $8)
    RETURNING id, conversation_id, sender_id, body, attachments, voice_note,
              shared_item, reply_to_id, forwarded, status, edited_at,
              created_at, updated_at
  `;
  const params = [
    input.conversationId,
    input.senderId,
    input.body,
    input.attachments ? JSON.stringify(input.attachments) : null,
    input.voiceNote ? JSON.stringify(input.voiceNote) : null,
    input.sharedItem ? JSON.stringify(input.sharedItem) : null,
    input.replyToId ?? null,
    input.forwarded ?? false,
  ];
  const result = db
    ? await db.query<MessageRow>(text, params)
    : await query<MessageRow>(text, params);
  const row = result.rows[0];
  if (!row) throw new Error("messages.repo.insert returned no row");
  return row;
}

/** Edit a body. Only SENT messages; the service enforces the edit window. */
export async function updateBody(
  input: { id: string; body: string; editedAt: string },
  db?: Db
): Promise<string | null> {
  const text = `UPDATE messages
                SET body = $2, edited_at = $3
                WHERE id = $1 AND status = 'SENT'
                RETURNING id`;
  const params = [input.id, input.body, input.editedAt];
  const result = db
    ? await db.query<{ id: string }>(text, params)
    : await query<{ id: string }>(text, params);
  return result.rows[0]?.id ?? null;
}

/** "Deleted for me": append the viewer to the message's per-user removals. */
export async function markDeletedFor(
  input: { id: string; viewerId: string },
  db?: Db
): Promise<void> {
  const text = `UPDATE messages
                SET deleted_for = array_append(deleted_for, $2::uuid)
                WHERE id = $1
                  AND NOT ($2::uuid = ANY(deleted_for))`;
  const params = [input.id, input.viewerId];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/**
 * "Deleted for everyone": tombstone the row and strip its content. The
 * thread keeps its shape — a gap where a message was is honest; a silently
 * renumbered thread is a lie. Returns null when the message was already
 * gone or already a tombstone (idempotent).
 */
export async function softDeleteForEveryone(
  id: string,
  db?: Db
): Promise<{ id: string; conversation_id: string } | null> {
  const text = `UPDATE messages
                SET status = 'DELETED', body = NULL, attachments = '[]'::jsonb,
                    voice_note = NULL, shared_item = NULL, reply_to_id = NULL,
                    edited_at = NULL
                WHERE id = $1 AND status = 'SENT'
                RETURNING id, conversation_id`;
  const result = db
    ? await db.query<{ id: string; conversation_id: string }>(text, [id])
    : await query<{ id: string; conversation_id: string }>(text, [id]);
  return result.rows[0] ?? null;
}

/** Reactions die with the message they were left on. */
export async function removeReactions(
  messageId: string,
  db?: Db
): Promise<void> {
  const text = `DELETE FROM message_reactions WHERE message_id = $1`;
  if (db) await db.query(text, [messageId]);
  else await query(text, [messageId]);
}
