-- Add is_featured column to shop_products
-- Purpose: Allow tenants to mark products as featured for homepage/category highlights
-- Backward compatible: DEFAULT false means no existing behavior changes

ALTER TABLE shop_products
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN shop_products.is_featured IS
  'Marks product as featured for prominent display on homepage or category pages';

-- Partial index for efficient featured product queries per tenant
-- Only indexes published + featured rows (small subset)
CREATE INDEX idx_shop_products_featured
  ON shop_products (tenant_id, is_featured)
  WHERE is_published = true AND is_featured = true;

-- Verification:
-- SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'shop_products' AND column_name = 'is_featured';
--
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'shop_products' AND indexname = 'idx_shop_products_featured';
