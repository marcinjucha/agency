-- Add reusable alt text to media_items.
--
-- Editors can set alt text once per media item; consumers render it for
-- accessibility (screen readers) and SEO (image alt attribute). Nullable —
-- null means "not set", in which case the app falls back to media_items.name.
--
-- No new RLS policy: media_items is already RLS-protected via the existing
-- tenant_isolation policies; a nullable text column inherits those row policies.
--
-- Verification:
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'media_items' AND column_name = 'alt_text';
--   SET ROLE anon; SELECT * FROM media_items; RESET ROLE; -- 0 rows (RLS intact)

ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS alt_text TEXT;

COMMENT ON COLUMN public.media_items.alt_text IS
  'Reusable alt text for accessibility and SEO. Falls back to media_items.name when null.';
