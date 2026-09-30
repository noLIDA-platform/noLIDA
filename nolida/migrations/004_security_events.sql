CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX security_events_user_idx
  ON security_events (user_id, created_at DESC);
CREATE INDEX security_events_type_idx
  ON security_events (event_type, created_at DESC);

-- Supabase PostgREST serves every table in the public schema to the
-- anon/authenticated roles unless RLS is enabled. Deny both so only the
-- postgres owner (our pg server client) can read or write auth rows.
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;
