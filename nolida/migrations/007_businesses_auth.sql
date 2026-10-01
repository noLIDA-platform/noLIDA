CREATE TABLE authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  purpose TEXT NOT NULL DEFAULT 'BUSINESS_LISTING',
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_code_status_valid CHECK (status IN (
    'ACTIVE', 'USED', 'EXPIRED', 'REVOKED', 'SUSPENDED'
  ))
);

CREATE INDEX auth_codes_status_idx ON authorization_codes (status);
CREATE INDEX auth_codes_code_idx ON authorization_codes (code);

CREATE TRIGGER auth_codes_set_updated_at
  BEFORE UPDATE ON authorization_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE authorization_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES authorization_codes(id) ON DELETE CASCADE,
  used_by_user_id UUID NOT NULL REFERENCES users(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  metadata JSONB
);

CREATE INDEX auth_code_usage_code_idx ON authorization_code_usage (code_id);
CREATE INDEX auth_code_usage_user_idx ON authorization_code_usage (used_by_user_id);

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  socials JSONB DEFAULT '{}'::jsonb,
  location TEXT,
  service_areas JSONB DEFAULT '[]'::jsonb,
  hours JSONB DEFAULT '{}'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  status_reason TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_status_valid CHECK (status IN (
    'DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED',
    'APPROVED', 'REJECTED', 'SUSPENDED', 'UNPUBLISHED'
  )),
  CONSTRAINT business_name_length CHECK (char_length(name) BETWEEN 2 AND 120)
);

CREATE INDEX businesses_owner_idx ON businesses (owner_user_id);
CREATE INDEX businesses_status_idx ON businesses (status);
CREATE INDEX businesses_slug_idx ON businesses (slug);

CREATE TRIGGER businesses_set_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE business_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'OWNER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id),
  CONSTRAINT business_owner_role_valid CHECK (role IN ('OWNER', 'MANAGER'))
);

CREATE TABLE business_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submission_status_valid CHECK (status IN (
    'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'
  ))
);

CREATE INDEX business_submissions_business_idx
  ON business_submissions (business_id, submitted_at DESC);

CREATE TABLE approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES business_submissions(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT approval_action_valid CHECK (action IN (
    'APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND', 'UNPUBLISH'
  ))
);

CREATE INDEX approval_records_business_idx
  ON approval_records (business_id, created_at DESC);
