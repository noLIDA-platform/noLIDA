/**
 * Shared row shapes for the auth repositories.
 * Single source of truth so services import types from one place.
 */

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  password_hash: string | null;
  status: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
  timezone: string | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  fingerprint: string;
  user_agent: string | null;
  ip_address: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  device_id: string | null;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  risk_level: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface OtpRecord {
  id: string;
  identifier: string;
  identifier_type: string;
  code_hash: string;
  purpose: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}
