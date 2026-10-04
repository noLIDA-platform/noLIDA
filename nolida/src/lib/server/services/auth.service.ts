import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { withTransaction } from "@/lib/db/client";
import { isDevOtpBypassEnabled } from "@/lib/server/auth/dev-bypass";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import * as profilesRepo from "@/lib/server/repositories/profiles.repo";
import * as sessionsRepo from "@/lib/server/repositories/sessions.repo";
import * as devicesRepo from "@/lib/server/repositories/devices.repo";
import * as otpRepo from "@/lib/server/repositories/otp.repo";
import * as securityEventsRepo from "@/lib/server/repositories/securityEvents.repo";
import { sendOtpEmail, type OtpPurpose } from "./email.service";

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const SESSION_TTL_DAYS = 30;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

// Used only to equalize timing on the unknown-user login path so an
// attacker cannot tell "no such account" from "wrong password" by speed.
const DUMMY_BCRYPT_HASH =
  "$2b$12$KIX9vVZ7bQmD6s9oQ8mZ5uJ7mY3wQ1xV2bN4cD5fE6gH7iJ8kL9mN0O";

const emailSchema = z.email().max(320);
const phoneSchema = z.string().min(4).max(32);
const passwordSchema = z.string().min(8).max(128);
const otpCodeSchema = z.string().regex(/^\d{6}$/);

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isEmail(identifier: string): boolean {
  return emailSchema.safeParse(identifier).success;
}

function errorCodeOf(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function normalizeContact(input: { email?: string; phone?: string }): {
  identifier: string;
  identifierType: "EMAIL" | "PHONE";
} {
  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = input.phone?.trim() || undefined;
  if (email && emailSchema.safeParse(email).success) {
    return { identifier: email, identifierType: "EMAIL" };
  }
  if (phone && phoneSchema.safeParse(phone).success) {
    return { identifier: phone, identifierType: "PHONE" };
  }
  throw new AuthError(
    "INVALID_CONTACT",
    "Provide a valid email address or phone number."
  );
}

async function consumeOtp(recordId: string): Promise<void> {
  await otpRepo.consume(recordId);
}

async function verifyOtpRecord(input: {
  identifier: string;
  code: string;
  purpose: OtpPurpose;
  ip?: string;
  userAgent?: string;
}): Promise<{ userId: string | null }> {
  if (!otpCodeSchema.safeParse(input.code).success) {
    throw new AuthError("OTP_INVALID", "The verification code is incorrect.");
  }
  const record = await otpRepo.findActiveByIdentifier(input.identifier, input.purpose);
  if (!record) {
    throw new AuthError("OTP_NOT_FOUND", "No active code found. Request a new one.");
  }
  // Defensive: the lookup above already filters consumed rows, so reaching
  // this branch would mean a race or a repo bug.
  if (record.consumed_at !== null) {
    throw new AuthError("OTP_ALREADY_USED", "This code was already used.");
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new AuthError("OTP_EXPIRED", "This code has expired. Request a new one.");
  }
  if (record.attempts >= record.max_attempts) {
    throw new AuthError("OTP_LOCKED", "Too many attempts. Request a new code.");
  }
  const incomingHash = hashOtp(input.code);
  if (incomingHash !== record.code_hash) {
    await otpRepo.incrementAttempts(record.id);
    await securityEventsRepo.log({
      eventType: "OTP_FAILED",
      ipAddress: input.ip,
      userAgent: input.userAgent,
      metadata: { purpose: input.purpose },
    });
    throw new AuthError("OTP_INVALID", "The verification code is incorrect.");
  }
  await consumeOtp(record.id);

  let userId: string | null = null;
  const user = isEmail(input.identifier)
    ? await usersRepo.findByEmail(input.identifier)
    : await usersRepo.findByPhone(input.identifier);
  if (user) {
    if (input.purpose === "REGISTER" || input.purpose === "VERIFY_CONTACT") {
      if (isEmail(input.identifier)) await usersRepo.markEmailVerified(user.id);
      else await usersRepo.markPhoneVerified(user.id);
    }
    userId = user.id;
  }

  await securityEventsRepo.log({
    userId,
    eventType: "OTP_VERIFIED",
    ipAddress: input.ip,
    userAgent: input.userAgent,
    metadata: { purpose: input.purpose },
  });
  return { userId };
}

export interface RegisterResult {
  userId: string;
  identifier: string;
  identifierType: "EMAIL" | "PHONE";
  /**
   * True only when the dev OTP bypass marked the contact verified inline.
   * The signup page uses it to skip `/verify` and log the new user straight
   * in. Always `false` in production — see `auth/dev-bypass.ts`.
   */
  verified: boolean;
}

export async function register(input: {
  email?: string;
  phone?: string;
  password: string;
  ip?: string;
  userAgent?: string;
}): Promise<RegisterResult> {
  if (!passwordSchema.safeParse(input.password).success) {
    throw new AuthError("WEAK_PASSWORD", "Password must be at least 8 characters.");
  }
  const { identifier, identifierType } = normalizeContact({
    email: input.email,
    phone: input.phone,
  });

  const existing =
    identifierType === "EMAIL"
      ? await usersRepo.findByEmail(identifier)
      : await usersRepo.findByPhone(identifier);
  if (existing) {
    throw new AuthError(
      identifierType === "EMAIL" ? "EMAIL_TAKEN" : "PHONE_TAKEN",
      identifierType === "EMAIL"
        ? "This email is already registered."
        : "This phone number is already registered."
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Atomic user + profile creation: a profile failure must never orphan a user.
  let userId: string;
  try {
    userId = await withTransaction(async (client) => {
      const user = await usersRepo.create(
        identifierType === "EMAIL"
          ? { email: identifier, passwordHash }
          : { phone: identifier, passwordHash },
        client
      );
      await profilesRepo.create({ userId: user.id }, client);
      return user.id;
    });
  } catch (error) {
    // Concurrent double-register: the CHECK passed for both, the UNIQUE won.
    if (errorCodeOf(error) === "23505") {
      throw new AuthError(
        identifierType === "EMAIL" ? "EMAIL_TAKEN" : "PHONE_TAKEN",
        identifierType === "EMAIL"
          ? "This email is already registered."
          : "This phone number is already registered."
      );
    }
    throw error;
  }

  // ── Dev OTP bypass (Phase 7F) ─────────────────────────────────────
  //
  // Placed after the user and profile exist but before any OTP row is
  // written, so the bypass path generates and sends nothing at all. There is
  // no half-state where a code was sent but never expected.
  //
  // `console.warn`, not `console.log`: it is a security-relevant event and
  // should stand out in a terminal full of ordinary dev output. The message
  // names the identifier so a developer can tell which account was created
  // unverified.
  if (isDevOtpBypassEnabled()) {
    if (identifierType === "EMAIL") {
      await usersRepo.markEmailVerified(userId);
    } else {
      await usersRepo.markPhoneVerified(userId);
    }

    await securityEventsRepo.log({
      userId,
      eventType: "USER_REGISTERED",
      ipAddress: input.ip,
      userAgent: input.userAgent,
      // Recorded on the security event, not only in the terminal: if this
      // flag is ever somehow live outside development, the audit trail says
      // so, and an operator can find every affected account.
      metadata: { identifierType, devBypass: true },
    });

    console.warn(
      `⚠️  DEV OTP BYPASS ACTIVE — user registered without verification: ${identifier}`,
    );

    return { userId, identifier, identifierType, verified: true };
  }

  // ── Normal flow ───────────────────────────────────────────────────
  const code = generateOtp();
  await otpRepo.create({
    identifier,
    identifierType,
    codeHash: hashOtp(code),
    purpose: "REGISTER",
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
  });

  if (identifierType === "EMAIL") {
    await sendOtpEmail({ to: identifier, code, purpose: "REGISTER" });
  } else if (process.env.NODE_ENV !== "production") {
    console.log(`=== DEV OTP === phone=${identifier} purpose=REGISTER code=${code}`);
  }

  await securityEventsRepo.log({
    userId,
    eventType: "USER_REGISTERED",
    ipAddress: input.ip,
    userAgent: input.userAgent,
    metadata: { identifierType, devBypass: false },
  });

  return { userId, identifier, identifierType, verified: false };
}

export async function verifyOtp(input: {
  identifier: string;
  code: string;
  purpose: OtpPurpose;
  ip?: string;
  userAgent?: string;
}): Promise<{ userId: string | null }> {
  return verifyOtpRecord(input);
}

export async function login(input: {
  email?: string;
  phone?: string;
  password: string;
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
}): Promise<{ userId: string; sessionToken: string; expiresAt: Date }> {
  const user = await usersRepo.findByEmailOrPhone(
    input.email?.trim().toLowerCase() || undefined,
    input.phone?.trim() || undefined
  );

  // Equalize timing: a dummy compare keeps "unknown user" as slow as a real
  // bcrypt check, so response time reveals nothing about account existence.
  if (!user || !user.password_hash) {
    await bcrypt.compare(input.password, DUMMY_BCRYPT_HASH);
    await securityEventsRepo.log({
      userId: user ? user.id : null,
      eventType: "LOGIN_FAILED",
      ipAddress: input.ip,
      userAgent: input.userAgent,
    });
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const matches = await bcrypt.compare(input.password, user.password_hash);
  if (!matches) {
    await securityEventsRepo.log({
      userId: user.id,
      eventType: "LOGIN_FAILED",
      ipAddress: input.ip,
      userAgent: input.userAgent,
    });
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError("ACCOUNT_SUSPENDED", "This account is not active.");
  }

  let riskLevel = "LOW";
  let deviceId: string | null = null;
  if (input.fingerprint) {
    const known = await devicesRepo.findByUserIdAndFingerprint(
      user.id,
      input.fingerprint
    );
    if (!known) riskLevel = "MEDIUM";
    // A later phase will add location + impossible-travel checks.
    const device = await devicesRepo.upsert({
      userId: user.id,
      fingerprint: input.fingerprint,
      userAgent: input.userAgent,
      ipAddress: input.ip,
    });
    deviceId = device.id;
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000);
  await sessionsRepo.create({
    userId: user.id,
    deviceId,
    tokenHash: hashSessionToken(sessionToken),
    ipAddress: input.ip,
    userAgent: input.userAgent,
    expiresAt,
  });

  await securityEventsRepo.log({
    userId: user.id,
    eventType: "LOGIN_SUCCEEDED",
    ipAddress: input.ip,
    userAgent: input.userAgent,
    metadata: { riskLevel },
  });

  return { userId: user.id, sessionToken, expiresAt };
}

export async function logout(input: { sessionToken: string }): Promise<void> {
  const session = await sessionsRepo.findByTokenHash(hashSessionToken(input.sessionToken));
  if (session) await sessionsRepo.revokeById(session.id);
}

export interface SessionUser {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    status: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
  profile: {
    id: string;
    user_id: string;
    username: string | null;
    full_name: string | null;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    country: string | null;
    city: string | null;
    language: string | null;
    timezone: string | null;
    currency: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

export async function getSessionUser(input: {
  sessionToken: string;
}): Promise<SessionUser | null> {
  const found = await sessionsRepo.findActiveByTokenHash(
    hashSessionToken(input.sessionToken)
  );
  if (!found) return null;
  // password_hash is destructured away so it can never reach the client.
  const { password_hash: _passwordHash, ...safeUser } = found.user;
  const profile = await profilesRepo.findByUserId(found.user.id);
  return {
    user: {
      id: safeUser.id,
      email: safeUser.email,
      phone: safeUser.phone,
      email_verified_at: safeUser.email_verified_at,
      phone_verified_at: safeUser.phone_verified_at,
      status: safeUser.status,
      role: safeUser.role,
      created_at: safeUser.created_at,
      updated_at: safeUser.updated_at,
    },
    profile: profile
      ? {
          id: profile.id,
          user_id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          country: profile.country,
          city: profile.city,
          language: profile.language,
          timezone: profile.timezone,
          currency: profile.currency,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        }
      : null,
  };
}

export async function requestPasswordReset(input: {
  identifier: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ ok: true }> {
  const raw = input.identifier.trim();
  const identifier = isEmail(raw) ? raw.toLowerCase() : raw;
  const user = isEmail(identifier)
    ? await usersRepo.findByEmail(identifier)
    : await usersRepo.findByPhone(identifier);
  // Always return ok — the response must not reveal whether the account exists.
  if (user) {
    const identifierType = isEmail(identifier) ? "EMAIL" : "PHONE";
    const code = generateOtp();
    await otpRepo.create({
      identifier,
      identifierType,
      codeHash: hashOtp(code),
      purpose: "RESET",
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    });
    if (identifierType === "EMAIL") {
      await sendOtpEmail({ to: identifier, code, purpose: "RESET" });
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`=== DEV OTP === phone=${identifier} purpose=RESET code=${code}`);
    }
    await securityEventsRepo.log({
      userId: user.id,
      eventType: "PASSWORD_RESET_REQUESTED",
      ipAddress: input.ip,
      userAgent: input.userAgent,
    });
  }
  return { ok: true as const };
}

export async function resetPassword(input: {
  identifier: string;
  code: string;
  newPassword: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ ok: true }> {
  if (!passwordSchema.safeParse(input.newPassword).success) {
    throw new AuthError("WEAK_PASSWORD", "Password must be at least 8 characters.");
  }
  const raw = input.identifier.trim();
  const identifier = isEmail(raw) ? raw.toLowerCase() : raw;
  await verifyOtpRecord({
    identifier,
    code: input.code,
    purpose: "RESET",
    ip: input.ip,
    userAgent: input.userAgent,
  });
  const user = isEmail(identifier)
    ? await usersRepo.findByEmail(identifier)
    : await usersRepo.findByPhone(identifier);
  if (!user) {
    throw new AuthError("OTP_NOT_FOUND", "No active code found. Request a new one.");
  }
  const hash = await bcrypt.hash(input.newPassword, 12);
  await usersRepo.updatePasswordHash(user.id, hash);
  await sessionsRepo.revokeAllForUser(user.id);
  await securityEventsRepo.log({
    userId: user.id,
    eventType: "PASSWORD_RESET",
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });
  return { ok: true as const };
}




