import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import { ZERO_UUID } from "./conversations.repo";

type Db = Pick<PoolClient, "query">;

export interface ReadPointerRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
}

/**
 * Read receipts (Phase 10).
 *
 * There is no per-message receipt row. A receipt row table costs one insert
 * per message per reader, forever, to answer a question the member's
 * last-read pointer answers in O(1): a message is read once the reader's
 * (last_read_at, last_read_message_id) pointer has passed it. The pointer
 * only ever moves FORWARD — `GREATEST` on the timestamp stops a late-arriving
 * request on an old tab from un-reading what a newer tab already cleared.
 */
export async function markRead(input: {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  at: string;
}, db?: Db): Promise<ReadPointerRow | null> {
  const text = `
    UPDATE conversation_members
    SET last_read_message_id = $3,
        last_read_at = GREATEST(last_read_at, $4::timestamptz)
    WHERE conversation_id = $1 AND user_id = $2
    RETURNING conversation_id, user_id, last_read_at, last_read_message_id
  `;
  const params = [input.conversationId, input.userId, input.lastReadMessageId, input.at];
  const result = db
    ? await db.query<ReadPointerRow>(text, params)
    : await query<ReadPointerRow>(text, params);
  return result.rows[0] ?? null;
}

export async function getPointer(
  conversationId: string,
  userId: string,
  db?: Db
): Promise<ReadPointerRow | null> {
  const text = `SELECT conversation_id, user_id, last_read_at, last_read_message_id
                FROM conversation_members
                WHERE conversation_id = $1 AND user_id = $2`;
  const result = db
    ? await db.query<ReadPointerRow>(text, [conversationId, userId])
    : await query<ReadPointerRow>(text, [conversationId, userId]);
  return result.rows[0] ?? null;
}

/**
 * Has `readerId` read a message that occurred at (createdAt, id)?
 * Used for single-message refreshes after a mutation.
 */
export async function hasRead(input: {
  conversationId: string;
  readerId: string;
  message: { createdAt: string; id: string };
}, db?: Db): Promise<boolean> {
  const text = `
    SELECT (
      (m.created_at, m.id) <= (
        cm.last_read_at,
        COALESCE(cm.last_read_message_id, '${ZERO_UUID}'::uuid)
      )
    ) AS read
    FROM (SELECT $2::timestamptz AS created_at, $3::uuid AS id) m
    JOIN conversation_members cm
      ON cm.conversation_id = $1 AND cm.user_id = $4
  `;
  const params = [
    input.conversationId,
    input.message.createdAt,
    input.message.id,
    input.readerId,
  ];
  const result = db
    ? await db.query<{ read: boolean }>(text, params)
    : await query<{ read: boolean }>(text, params);
  return result.rows[0]?.read ?? false;
}
