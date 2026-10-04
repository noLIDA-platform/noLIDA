import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";

type Db = Pick<PoolClient, "query">;

export async function log(
  input: {
    userId?: string | null;
    eventType: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
  // Phase 7E: optional, so an audit row can commit with the transaction it
  // describes. Without it the event is written on a pool connection and would
  // outlive a rollback — recording something that did not happen.
  db?: Db
): Promise<void> {
  const text = `INSERT INTO security_events (user_id, event_type, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`;
  const params = [
    input.userId ?? null,
    input.eventType,
    input.ipAddress ?? null,
    input.userAgent ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
  ];

  if (db) {
    await db.query(text, params);
    return;
  }
  await query(text, params);
}
