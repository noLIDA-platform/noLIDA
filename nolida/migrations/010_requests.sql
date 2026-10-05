-- Requests and responses (Phase 9).
--
-- A request is its OWN entity, not a post type. Creating one also writes a
-- REQUEST_POST row so the request is discoverable in the ordinary feed, but the
-- lifecycle here — responses, acceptance, closing — lives only in these tables.
-- Keeping them separate is what lets the feed post be edited or moderated
-- independently of a live job someone is waiting on.
--
-- MONEY: budget_min / budget_max are integer MAJOR units (naira), NOT the
-- minor units (kobo) that products and services use. A budget is an estimate a
-- person types in their head — "under ₦50,000" — and kobo precision on it would
-- be a precision nobody asked for and every reader would misread. The composer
-- takes major units and this column stores them unchanged.

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT NOT NULL DEFAULT 'NGN',
  urgency TEXT NOT NULL DEFAULT 'NORMAL',
  location TEXT,
  deadline DATE,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN',
  -- Denormalised. Deliberately: the open-requests list renders a count on every
  -- row, and a correlated COUNT per row would be the slowest query on the page.
  -- It is written only inside the same transaction as the response that changes
  -- it, and clamped with GREATEST so a retry cannot drive it negative.
  response_count INTEGER NOT NULL DEFAULT 0,
  accepted_response_id UUID,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT request_title_length CHECK (
    char_length(title) BETWEEN 5 AND 200
  ),
  CONSTRAINT request_description_length CHECK (
    char_length(description) BETWEEN 10 AND 5000
  ),
  CONSTRAINT request_urgency_valid CHECK (urgency IN (
    'URGENT', 'NORMAL', 'FLEXIBLE'
  )),
  CONSTRAINT request_status_valid CHECK (status IN (
    'OPEN', 'IN_PROGRESS', 'FULFILLED', 'CLOSED', 'CANCELLED'
  )),
  -- A range, not two independent numbers: 50,000 min against 20,000 max is not
  -- a generous budget, it is a mistake, and it would render as "₦50,000 –
  -- ₦20,000".
  CONSTRAINT request_budget_valid CHECK (
    (budget_min IS NULL OR budget_min >= 0) AND
    (budget_max IS NULL OR budget_max >= 0) AND
    (budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min)
  ),
  CONSTRAINT request_response_count_valid CHECK (response_count >= 0)
);

CREATE INDEX requests_user_idx ON requests (user_id, created_at DESC);
-- Serves the open feed, which always filters on status and orders by
-- created_at DESC.
CREATE INDEX requests_status_idx ON requests (status, created_at DESC);
CREATE INDEX requests_category_idx ON requests (category_id, status);

CREATE TRIGGER requests_set_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  -- SET NULL rather than CASCADE: losing a business must not delete an offer
  -- somebody made and accepted. The response stays, attributed to a person.
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  -- The individual who sent it. Kept separately from business_id because a
  -- response must remain attributable after the business is gone, and because
  -- withdrawing a response is the individual's right, not the business's.
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  price_estimate INTEGER,
  currency TEXT DEFAULT 'NGN',
  availability_note TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT response_message_length CHECK (
    char_length(message) BETWEEN 5 AND 2000
  ),
  CONSTRAINT response_status_valid CHECK (status IN (
    'PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'
  )),
  CONSTRAINT response_price_positive CHECK (
    price_estimate IS NULL OR price_estimate >= 0
  ),
  -- One offer per business per request, so a business cannot pile up on a
  -- request and crowd out competitors.
  --
  -- NULL CAVEAT, and it is worth knowing: Postgres treats NULLs as distinct in a
  -- unique index, so rows with business_id NULL do not collide. In practice
  -- business_id is never NULL — only an APPROVED business may respond — but
  -- ON DELETE SET NULL above can produce such a row after a business is removed.
  -- Two orphaned rows for the same request would then both be allowed.
  CONSTRAINT one_response_per_business UNIQUE (request_id, business_id)
);

CREATE INDEX request_responses_request_idx
  ON request_responses (request_id, created_at ASC);
CREATE INDEX request_responses_business_idx
  ON request_responses (business_id, created_at DESC);
CREATE INDEX request_responses_user_idx
  ON request_responses (user_id, created_at DESC);

CREATE TRIGGER request_responses_set_updated_at
  BEFORE UPDATE ON request_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();