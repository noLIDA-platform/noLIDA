import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

/**
 * Typing (Phase 10).
 *
 * An expiring flag, not a stream: re-armed by the client every few seconds
 * while keys are down, pruned opportunistically on every read and write for
 * THIS conversation so the table never becomes a graveyard of finished
 * typing sessions. Nothing blocks on it — a missing row just means "not
 * typing", never an error.
 */
export async function touch(input: {
  conversationId: string;
  userId: string;
  expiresAt: string;
}, db?: Db): Promise<void> {
  const prune = `DELETE FROM typing_status
                 WHERE conversation_id = $1 AND expires_at < now()`;
  const upsert = `
    INSERT INTO typing_status (conversation_id, user_id, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET expires_at = EXCLUDED.expires_at
  `;
  const params = [input.conversationId, input.userId, input.expiresAt];
  if (db) {
    await db.query(prune, [input.conversationId]);
    await db.query(upsert, params);
  } else {
    await query(prune, [input.conversationId]);
    await query(upsert, params);
  }
}

/** Keyboard left the box: stop claiming to type, immediately. */
export async function clear(
  input: { conversationId: string; userId: string },
  db?: Db
): Promise<void> {
  const text = `DELETE FROM typing_status
                WHERE conversation_id = $1 AND user_id = $2`;
  const params = [input.conversationId, input.userId];
  if (db) await db.query(text, params);
  else await query(text, params);
}

/** Everyone still typing in this conversation, minus the caller. */
export async function listActiveUserIds(input: {
  conversationId: string;
  excludeUserId: string;
}, db?: Db): Promise<string[]> {
  const prune = `DELETE FROM typing_status
                 WHERE conversation_id = $1 AND expires_at < now()`;
  const select = `SELECT user_id FROM typing_status
                  WHERE conversation_id = $1
                    AND user_id <> $2
                    AND expires_at > now()`;
  const params = [input.conversationId, input.excludeUserId];
  const result = db
    ? await db.query<{ user_id: string }>(select, params)
    : await query<{ user_id: string }>(select, params);
  if (db) await db.query(prune, [input.conversationId]);
  else await query(prune, [input.conversationId]);
  return result.rows.map((row) => row.user_id);
}
