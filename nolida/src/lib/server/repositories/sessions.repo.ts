import { query } from "@/lib/db/client";
import type { Session, User } from "./types";

const COLUMNS = [
  "id",
  "user_id",
  "device_id",
  "token_hash",
  "ip_address",
  "user_agent",
  "risk_level",
  "expires_at",
  "revoked_at",
  "created_at",
].join(", ");

const USER_COLUMNS = [
  "u.id",
  "u.email",
  "u.phone",
  "u.email_verified_at",
  "u.phone_verified_at",
  "u.password_hash",
  "u.status",
  "u.role",
  "u.created_at",
  "u.updated_at",
].join(", ");

export async function create(input: {
  userId: string;
  deviceId?: string | null;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<Session> {
  const result = await query<Session>(
    `INSERT INTO sessions (user_id, device_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [
      input.userId,
      input.deviceId ?? null,
      input.tokenHash,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.expiresAt.toISOString(),
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error("sessions.repo.create returned no row");
  return row;
}

export async function findByTokenHash(tokenHash: string): Promise<Session | null> {
  const result = await query<Session>(
    `SELECT ${COLUMNS} FROM sessions WHERE token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function findActiveByTokenHash(
  tokenHash: string
): Promise<{ session: Session; user: User } | null> {
  interface JoinedRow {
    session_id: string;
    session_user_id: string;
    session_device_id: string | null;
    session_token_hash: string;
    session_ip_address: string | null;
    session_user_agent: string | null;
    session_risk_level: string;
    session_expires_at: string;
    session_revoked_at: string | null;
    session_created_at: string;
    user_id: string;
    user_email: string | null;
    user_phone: string | null;
    user_email_verified_at: string | null;
    user_phone_verified_at: string | null;
    user_password_hash: string | null;
    user_status: string;
    user_role: string;
    user_created_at: string;
    user_updated_at: string;
  }
  const result = await query<JoinedRow>(
    `SELECT ${COLUMNS
      .split(", ")
      .map((c) => `s.${c} AS "session_${c}"`)
      .join(", ")},
            ${USER_COLUMNS.split(", ")
              .map((c) => `${c} AS "user_${c.replace("u.", "")}"`)
              .join(", ")}
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  const session: Session = {
    id: row.session_id,
    user_id: row.session_user_id,
    device_id: row.session_device_id,
    token_hash: row.session_token_hash,
    ip_address: row.session_ip_address,
    user_agent: row.session_user_agent,
    risk_level: row.session_risk_level,
    expires_at: row.session_expires_at,
    revoked_at: row.session_revoked_at,
    created_at: row.session_created_at,
  };
  const user: User = {
    id: row.user_id,
    email: row.user_email,
    phone: row.user_phone,
    email_verified_at: row.user_email_verified_at,
    phone_verified_at: row.user_phone_verified_at,
    password_hash: row.user_password_hash,
    status: row.user_status,
    role: row.user_role,
    created_at: row.user_created_at,
    updated_at: row.user_updated_at,
  };
  return { session, user };
}

export async function revokeById(id: string): Promise<void> {
  await query("UPDATE sessions SET revoked_at = NOW() WHERE id = $1", [id]);
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await query(
    "UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId]
  );
}

export async function deleteExpired(): Promise<number> {
  const result = await query("DELETE FROM sessions WHERE expires_at <= NOW()");
  return result.rowCount ?? 0;
}
