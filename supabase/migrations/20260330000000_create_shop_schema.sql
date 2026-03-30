-- Shop Platform DB schema: listing_type enum, shop_categories, shop_products, media_folders + media_items alteration
-- Task: AAA-T-133
--
-- Verification steps:
--   -- shop_categories:
--   SELECT * FROM shop_categories LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM shop_categories; RESET ROLE;
--   SET ROLE anon; SELECT * FROM shop_categories; RESET ROLE; -- should return all rows (public catalog)
--   -- shop_products:
--   SELECT * FROM shop_products LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM shop_products; RESET ROLE;
--   SET ROLE anon; SELECT * FROM shop_products WHERE is_published = true; RESET ROLE; -- should return published only
--   SET ROLE anon; SELECT * FROM shop_products WHERE is_published = false; RESET ROLE; -- should return 0 rows
--   -- media_folders:
--   SELECT * FROM media_folders LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM media_folders; RESET ROLE;
--   SET ROLE anon; SELECT * FROM media_folders; RESET ROLE; -- should return 0 rows
--   -- media_items folder_id:
--   SELECT folder_id FROM media_items LIMIT 1;

-- ==========================================
-- SECTION 1: listing_type enum
-- ==========================================

CREATE TYPE listing_type AS ENUM ('external_link', 'digital_download');

-- ==========================================
-- SECTION 2: shop_categories
-- ==========================================

CREATE TABLE shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_shop_categories_tenant ON shop_categories(tenant_id);
CREATE INDEX idx_shop_categories_slug ON shop_categories(tenant_id, slug);

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON shop_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;

-- authenticated: full CRUD where tenant_id = current_user_tenant_id()
CREATE POLICY "Tenant users can view shop categories"
  ON shop_categories FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert shop categories"
  ON shop_categories FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update shop categories"
  ON shop_categories FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete shop categories"
  ON shop_categories FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- anon: SELECT all (categories are public catalog data)
CREATE POLICY "Anyone can view shop categories"
  ON shop_categories FOR SELECT
  TO anon
  USING (true);

-- ==========================================
-- SECTION 3: shop_products
-- ==========================================

CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description JSONB,
  html_body TEXT,
  short_description TEXT,
  listing_type listing_type NOT NULL DEFAULT 'external_link',
  external_url TEXT,
  digital_file_url TEXT,
  digital_file_name TEXT,
  digital_file_size BIGINT,
  price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'PLN',
  cover_image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  category_id UUID REFERENCES shop_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_metadata JSONB,
  display_layout TEXT NOT NULL DEFAULT 'gallery' CHECK (display_layout IN ('gallery', 'editorial')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_shop_products_tenant ON shop_products(tenant_id);
CREATE INDEX idx_shop_products_slug ON shop_products(tenant_id, slug);
CREATE INDEX idx_shop_products_category ON shop_products(category_id);
CREATE INDEX idx_shop_products_published ON shop_products(tenant_id, published_at DESC) WHERE is_published = true;

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

-- authenticated: full CRUD where tenant_id = current_user_tenant_id()
CREATE POLICY "Tenant users can view shop products"
  ON shop_products FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert shop products"
  ON shop_products FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update shop products"
  ON shop_products FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete shop products"
  ON shop_products FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- anon: SELECT WHERE is_published = true (public catalog)
CREATE POLICY "Anyone can view published shop products"
  ON shop_products FOR SELECT
  TO anon
  USING (is_published = true);

-- ==========================================
-- SECTION 4: media_folders + media_items alteration
-- ==========================================

CREATE TABLE media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, parent_id, name)
);

-- Indexes
CREATE INDEX idx_media_folders_tenant ON media_folders(tenant_id);
CREATE INDEX idx_media_folders_parent ON media_folders(parent_id);

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON media_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;

-- authenticated: full CRUD where tenant_id = current_user_tenant_id()
CREATE POLICY "Tenant users can view media folders"
  ON media_folders FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can insert media folders"
  ON media_folders FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can update media folders"
  ON media_folders FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant users can delete media folders"
  ON media_folders FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- No anon policies — media_folders is admin-only

-- ALTER media_items: add folder_id reference
ALTER TABLE media_items ADD COLUMN folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_media_items_folder ON media_items(folder_id);
