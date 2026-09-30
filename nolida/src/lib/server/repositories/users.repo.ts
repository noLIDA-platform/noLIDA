import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { User } from "./types";

type Db = Pick<PoolClient, "query">;

const COLUMNS = [
  "id",
  "email",
  "phone",
  "email_verified_at",
  "phone_verified_at",
  "password_hash",
  "status",
  "role",
  "created_at",
  "updated_at",
].join(", ");

export async function findById(id: string): Promise<User | null> {
  const result = await query<User>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [email]);
  return result.rows[0] ?? null;
}

export async function findByPhone(phone: string): Promise<User | null> {
  const result = await query<User>(`SELECT ${COLUMNS} FROM users WHERE phone = $1`, [phone]);
  return result.rows[0] ?? null;
}

export async function findByEmailOrPhone(
  email?: string,
  phone?: string
): Promise<User | null> {
  if (email) return findByEmail(email);
  if (phone) return findByPhone(phone);
  return null;
}

export async function create(
  input: { email?: string; phone?: string; passwordHash: string },
  db?: Db
): Promise<User> {
  const text =
    `INSERT INTO users (email, phone, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`;
  const params = [input.email ?? null, input.phone ?? null, input.passwordHash];
  const result = db
    ? await db.query(text, params)
    : await query(text, params);
  const row = (result.rows[0] ?? null) as User | null;
  if (!row) throw new Error("users.repo.create returned no row");
  return row;
}

export async function markEmailVerified(userId: string): Promise<void> {
  await query("UPDATE users SET email_verified_at = NOW() WHERE id = $1", [userId]);
}

export async function markPhoneVerified(userId: string): Promise<void> {
  await query("UPDATE users SET phone_verified_at = NOW() WHERE id = $1", [userId]);
}

export async function updatePasswordHash(userId: string, hash: string): Promise<void> {
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
}

export async function updateStatus(userId: string, status: string): Promise<void> {
  await query("UPDATE users SET status = $1 WHERE id = $2", [status, userId]);
}
