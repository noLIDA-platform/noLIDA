CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX categories_parent_idx ON categories (parent_id);
CREATE INDEX categories_active_idx ON categories (is_active, sort_order);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price_min INTEGER,
  price_max INTEGER,
  currency TEXT NOT NULL DEFAULT 'NGN',
  duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_name_length CHECK (char_length(name) BETWEEN 2 AND 120),
  CONSTRAINT service_price_positive CHECK (
    (price_min IS NULL OR price_min >= 0) AND
    (price_max IS NULL OR price_max >= 0) AND
    (price_max IS NULL OR price_min IS NULL OR price_max >= price_min)
  )
);

CREATE INDEX services_business_idx ON services (business_id, sort_order);
CREATE INDEX services_category_idx ON services (category_id);

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  stock INTEGER,
  images JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_name_length CHECK (char_length(name) BETWEEN 2 AND 120),
  CONSTRAINT product_price_positive CHECK (price >= 0),
  CONSTRAINT product_stock_positive CHECK (stock IS NULL OR stock >= 0)
);

CREATE INDEX products_business_idx ON products (business_id, sort_order);
CREATE INDEX products_category_idx ON products (category_id);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();