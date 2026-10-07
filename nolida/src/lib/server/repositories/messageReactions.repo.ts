import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export interface MessageReactionRow {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/**
 * Reactions: ONE per user per message (the primary key is the constraint),
 * so reacting twice updates the emoji instead of stacking duplicates — no
 * read-then-write, ever. The service only ever accepts an emoji from the
 * fixed set in `@/lib/messaging/constants`.
 */
export async function add(input: {
  messageId: string;
  userId: string;
  emoji: string;
}, db?: Db): Promise<MessageReactionRow | null> {
  const text = `
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES ($1, $2, $3)
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET emoji = EXCLUDED.emoji
    RETURNING message_id, user_id, emoji, created_at
  `;
  const params = [input.messageId, input.userId, input.emoji];
  const result = db
    ? await db.query<MessageReactionRow>(text, params)
    : await query<MessageReactionRow>(text, params);
  return result.rows[0] ?? null;
}

/** Idempotent: removing a reaction that is not there is a no-op. */
export async function remove(
  input: { messageId: string; userId: string },
  db?: Db
): Promise<boolean> {
  const text = `DELETE FROM message_reactions
                WHERE message_id = $1 AND user_id = $2`;
  const params = [input.messageId, input.userId];
  const result = db ? await db.query(text, params) : await query(text, params);
  return (result.rowCount ?? 0) > 0;
}

/** Flat reaction rows for a page of messages, batched in one query. */
export async function listForMessages(
  messageIds: string[],
  viewerId: string,
  db?: Db
): Promise<(MessageReactionRow & { mine: boolean })[]> {
  if (messageIds.length === 0) return [];
  const text = `
    SELECT mr.message_id, mr.user_id, mr.emoji, mr.created_at,
           (mr.user_id = $2) AS mine
    FROM message_reactions mr
    WHERE mr.message_id = ANY($1::uuid[])
  `;
  const params = [messageIds, viewerId];
  const result = db
    ? await db.query<MessageReactionRow & { mine: boolean }>(text, params)
    : await query<MessageReactionRow & { mine: boolean }>(text, params);
  return result.rows;
}
