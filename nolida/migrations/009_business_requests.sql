-- Business requests (Phase 7E).
--
-- The in-app replacement for "message us on WhatsApp and we'll send you a
-- code". Every row is one submission of the /list-your-business form, kept for
-- audit: it records what the user asked for, which authorization code it
-- produced, and where that code ended up.
--
-- `code_id` is ON DELETE SET NULL on purpose. Authorization codes are an
-- operational table that will eventually be pruned or rotated; deleting a code
-- must not delete the history of the request that created it. The request row
-- is the durable record, the code is the receipt.
--
-- 'APPROVED_INSTANT' is the default because in this flow a request always
-- yields an immediately-generated code. The other two statuses exist so a
-- later moderated flow does not need a migration just to record its outcome.
CREATE TABLE business_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT,
  contact_email TEXT,
  description TEXT,
  code_id UUID REFERENCES authorization_codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED_INSTANT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT request_status_valid CHECK (status IN (
    'APPROVED_INSTANT', 'PENDING_REVIEW', 'REJECTED'
  )),
  CONSTRAINT request_name_length CHECK (
    char_length(business_name) BETWEEN 2 AND 120
  ),
  -- The form caps these, but the database does not trust the form.
  CONSTRAINT request_category_length CHECK (
    category IS NULL OR char_length(category) <= 60
  ),
  CONSTRAINT request_description_length CHECK (
    description IS NULL OR char_length(description) <= 500
  )
);

-- Serves "list my requests, newest first" — the only read this table gets in
-- the app, so it is the only index it earns.
CREATE INDEX business_requests_user_idx
  ON business_requests (user_id, created_at DESC);

CREATE INDEX business_requests_code_idx
  ON business_requests (code_id);
