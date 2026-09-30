CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT users_role_valid CHECK (role IN (
    'USER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN',
    'SUPPORT_ADMIN', 'TRUST_SAFETY_ADMIN', 'ANALYTICS_ADMIN'
  )),
  CONSTRAINT users_status_valid CHECK (status IN (
    'ACTIVE', 'SUSPENDED', 'DELETED'
  ))
);

CREATE INDEX users_email_idx ON users (email) WHERE email IS NOT NULL;
CREATE INDEX users_phone_idx ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  country TEXT,
  city TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Africa/Lagos',
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profiles_username_idx ON profiles (username)
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supabase PostgREST serves every table in the public schema to the
-- anon/authenticated roles unless RLS is enabled. Deny both so only the
-- postgres owner (our pg server client) can read or write auth rows.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
