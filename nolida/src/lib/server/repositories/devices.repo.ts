import { query } from "@/lib/db/client";
import type { Device } from "./types";

const COLUMNS = [
  "id",
  "user_id",
  "fingerprint",
  "user_agent",
  "ip_address",
  "last_seen_at",
  "created_at",
].join(", ");

export async function upsert(input: {
  userId: string;
  fingerprint: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<Device> {
  const result = await query<Device>(
    `INSERT INTO devices (user_id, fingerprint, user_agent, ip_address)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, fingerprint)
     DO UPDATE SET user_agent = EXCLUDED.user_agent,
                   ip_address = EXCLUDED.ip_address,
                   last_seen_at = NOW()
     RETURNING ${COLUMNS}`,
    [
      input.userId,
      input.fingerprint,
      input.userAgent ?? null,
      input.ipAddress ?? null,
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error("devices.repo.upsert returned no row");
  return row;
}

export async function findByUserIdAndFingerprint(
  userId: string,
  fingerprint: string
): Promise<Device | null> {
  const result = await query<Device>(
    `SELECT ${COLUMNS} FROM devices WHERE user_id = $1 AND fingerprint = $2`,
    [userId, fingerprint]
  );
  return result.rows[0] ?? null;
}

export async function updateLastSeen(id: string): Promise<void> {
  await query("UPDATE devices SET last_seen_at = NOW() WHERE id = $1", [id]);
}
