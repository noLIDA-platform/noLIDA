CREATE TABLE otp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT otp_type_valid CHECK (identifier_type IN ('EMAIL', 'PHONE')),
  CONSTRAINT otp_purpose_valid CHECK (purpose IN (
    'REGISTER', 'LOGIN', 'RESET', 'VERIFY_CONTACT'
  ))
);

CREATE INDEX otp_identifier_idx ON otp_records (identifier, purpose)
  WHERE consumed_at IS NULL;

-- Supabase PostgREST serves every table in the public schema to the
-- anon/authenticated roles unless RLS is enabled. Deny both so only the
-- postgres owner (our pg server client) can read or write auth rows.
ALTER TABLE otp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_records FORCE ROW LEVEL SECURITY;
