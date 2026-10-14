import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { Profile } from "./types";

type Db = Pick<PoolClient, "query">;

const COLUMNS = [
  "id",
  "user_id",
  "username",
  "full_name",
  "display_name",
  "bio",
  "avatar_url",
  "date_of_birth",
  "country",
  "city",
  "language",
  "timezone",
  "currency",
  "onboarding_completed_at",
  "created_at",
  "updated_at",
].join(", ");

const UPDATABLE = new Set([
  "username",
  "full_name",
  "display_name",
  "bio",
  "avatar_url",
  "date_of_birth",
  "country",
  "city",
  "language",
  "timezone",
  "currency",
]);

export async function findByUserId(userId: string): Promise<Profile | null> {
  const result = await query<Profile>(
    `SELECT ${COLUMNS} FROM profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Look up a profile by its unique handle.
 *
 * `username` carries a unique index, so this is at most one row.
 *
 * Compared case-insensitively in SQL rather than in JS, because the value
 * arrives from a route parameter with whatever casing someone typed or a shared
 * link carried. `/user/Ada` and `/user/ada` are the same person; a case-sensitive
 * comparison would 404 one of them, and the failure looks like a broken link
 * rather than a typo. Handles are already stored lowercase by the profile
 * validator, so this can only ever be more forgiving, never ambiguous.
 */
export async function findByUsername(username: string): Promise<Profile | null> {
  const result = await query<Profile>(
    `SELECT ${COLUMNS} FROM profiles WHERE lower(username) = lower($1) LIMIT 1`,
    [username]
  );
  return result.rows[0] ?? null;
}

export async function create(
  input: { userId: string; username?: string; fullName?: string },
  db?: Db
): Promise<Profile> {
  const text =
    `INSERT INTO profiles (user_id, username, full_name)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`;
  const params = [input.userId, input.username ?? null, input.fullName ?? null];
  const result = db
    ? await db.query(text, params)
    : await query(text, params);
  const row = (result.rows[0] ?? null) as Profile | null;
  if (!row) throw new Error("profiles.repo.create returned no row");
  return row;
}

export async function update(
  userId: string,
  fields: Partial<Profile>
): Promise<Profile> {
  const entries = Object.entries(fields).filter(
    ([key, value]) => UPDATABLE.has(key) && value !== undefined
  );
  if (entries.length === 0) {
    const current = await findByUserId(userId);
    if (!current) throw new Error("profiles.repo.update: profile not found");
    return current;
  }
  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, value]) => value);
  const result = await query<Profile>(
    `UPDATE profiles SET ${sets.join(", ")} WHERE user_id = $${entries.length + 1}
     RETURNING ${COLUMNS}`,
    [...values, userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("profiles.repo.update: profile not found");
  return row;
}

export async function usernameExists(username: string): Promise<boolean> {
  const result = await query<{ one: number }>(
    "SELECT 1 AS one FROM profiles WHERE username = $1 LIMIT 1",
    [username]
  );
  return result.rows.length > 0;
}

/**
 * Stamp the first-login tour as completed (Phase 10.2).
 *
 * The timestamp is minted server-side with `NOW()`: the client only ever
 * sends the intent (`onboarding_completed: true`), never a value — a
 * client-supplied timestamp would be a lie waiting to happen. Idempotent:
 * completing twice just re-stamps.
 */
export async function markOnboardingComplete(userId: string): Promise<Profile> {
  const result = await query<Profile>(
    `UPDATE profiles SET onboarding_completed_at = NOW() WHERE user_id = $1
     RETURNING ${COLUMNS}`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("profiles.repo.markOnboardingComplete: profile not found");
  return row;
}
/**
 * Global messaging preferences live on the user's profile row. These are the
 * two knobs the chat honors:
 *
 *   read_receipts_enabled = false  ->  the client never advances
 *                                       last_read_at, so "read at" is never
 *                                       written for this viewer.
 *   typing_indicator_enabled = false ->  typing_status entries are never
 *   written for this viewer.
 *
 * Default on is ON; a spare profile row for a brand-new user also starts ON.
 */
export async function updateMessagingPrefs(
  userId: string,
  fields: Partial<{
    readReceiptsEnabled: boolean;
    typingIndicatorEnabled: boolean;
  }>
): Promise<Profile> {
  const entries = Object.entries(fields).filter(
    ([key, value]) =>
      (key === "readReceiptsEnabled" || key === "typingIndicatorEnabled") &&
      value !== undefined
  );
  if (entries.length === 0) {
    return findByUserId(userId);
  }

  const sets = entries.map(([key], i) => {
    const column =
      key === "readReceiptsEnabled"
        ? "read_receipts_enabled"
        : "typing_indicator_enabled";
    return `${column} = $${i + 1}`;
  });
  const values = entries.map(([, value]) => value);
  const result = await query<Profile>(
    `UPDATE profiles SET ${sets.join(", ")} WHERE user_id = $${values.length + 1}
     RETURNING id, user_id, username, full_name, display_name, bio, avatar_url,
               date_of_birth, country, city, language, timezone, currency,
               read_receipts_enabled, typing_indicator_enabled,
               onboarding_completed_at, created_at, updated_at`,
    [...values, userId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("profiles.repo.updateMessagingPrefs: profile not found");
  return row;
}