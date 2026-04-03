-- Add unique constraint on (product_id, connection_id) to enable correct upsert behavior
-- Previously only (connection_id, external_listing_id) was unique, causing
-- .upsert({ ... }, { onConflict: 'product_id,connection_id' }) to create duplicates
--
-- Verification steps:
--   supabase db reset
--   \d shop_marketplace_listings  -- should show new unique index
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'shop_marketplace_listings';

CREATE UNIQUE INDEX idx_shop_marketplace_listings_product_connection
  ON shop_marketplace_listings (product_id, connection_id);
