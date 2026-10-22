-- Bookings (Phase 11).
--
-- A booking is created from an accepted request response. The customer who
-- owns the request books the business that sent the accepted offer, and the
-- business then confirms or cancels the job.
--
-- Money: price_minor is stored in integer MINOR units (kobo for NGN), matching
-- services and products. A request response's price_estimate is in major units
-- (naira); the service converts when creating a booking from a response.

-- ===========================================================================
-- Section 1: Bookings table
-- ===========================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES request_responses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SET NULL rather than CASCADE: a booking is a receipt of work agreed with a
  -- business, and removing the business must not erase the record.
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  price_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_status_valid CHECK (status IN (
    'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'
  )),
  CONSTRAINT booking_price_positive CHECK (price_minor >= 0),
  -- One booking per accepted response: a customer books an accepted offer once.
  CONSTRAINT one_booking_per_response UNIQUE (response_id)
);

CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_business_idx ON bookings (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_request_idx ON bookings (request_id);
CREATE INDEX IF NOT EXISTS bookings_response_idx ON bookings (response_id);

-- Trigger: updated_at auto-bump (idempotent — drop before recreate).
DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;

-- ===========================================================================
-- Section 2: Availability table (Phase 11)
-- ===========================================================================
-- Weekly recurring availability windows that a business publishes so customers
-- can pick a slot when booking. Stored per day-of-week (0 = Sunday … 6 =
-- Saturday). A booking's scheduled_at must fall within one of these windows.

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_day_valid CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT availability_time_valid CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS availability_business_idx ON availability (business_id, day_of_week);

DROP TRIGGER IF EXISTS availability_set_updated_at ON availability;
CREATE TRIGGER availability_set_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability FORCE ROW LEVEL SECURITY;