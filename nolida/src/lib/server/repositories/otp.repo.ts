import { query } from "@/lib/db/client";
import type { OtpRecord } from "./types";

const COLUMNS = [
  "id",
  "identifier",
  "identifier_type",
  "code_hash",
  "purpose",
  "attempts",
  "max_attempts",
  "expires_at",
  "consumed_at",
  "created_at",
].join(", ");

export async function create(input: {
  identifier: string;
  identifierType: "EMAIL" | "PHONE";
  codeHash: string;
  purpose: "REGISTER" | "LOGIN" | "RESET" | "VERIFY_CONTACT";
  expiresAt: Date;
}): Promise<OtpRecord> {
  const result = await query<OtpRecord>(
    `INSERT INTO otp_records (identifier, identifier_type, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [
      input.identifier,
      input.identifierType,
      input.codeHash,
      input.purpose,
      input.expiresAt.toISOString(),
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error("otp.repo.create returned no row");
  return row;
}

export async function findActiveByIdentifier(
  identifier: string,
  purpose: string
): Promise<OtpRecord | null> {
  const result = await query<OtpRecord>(
    `SELECT ${COLUMNS} FROM otp_records
     WHERE identifier = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifier, purpose]
  );
  return result.rows[0] ?? null;
}

export async function incrementAttempts(id: string): Promise<void> {
  await query("UPDATE otp_records SET attempts = attempts + 1 WHERE id = $1", [id]);
}

export async function consume(id: string): Promise<void> {
  await query("UPDATE otp_records SET consumed_at = NOW() WHERE id = $1", [id]);
}

export async function deleteExpired(): Promise<number> {
  const result = await query(
    "DELETE FROM otp_records WHERE expires_at <= NOW() AND consumed_at IS NULL"
  );
  return result.rowCount ?? 0;
}
