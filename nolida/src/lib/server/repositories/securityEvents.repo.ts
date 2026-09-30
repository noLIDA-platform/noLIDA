import { query } from "@/lib/db/client";

export async function log(input: {
  userId?: string | null;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO security_events (user_id, event_type, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.userId ?? null,
      input.eventType,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}
