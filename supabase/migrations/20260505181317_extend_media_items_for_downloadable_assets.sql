-- AAA-T-110 (iter 1): Extend media_items for downloadable blog assets
--
-- Two changes:
--   1. ADD `is_downloadable` BOOLEAN flag — distinguishes inline media (rendered in
--      blog body) from downloadable assets (offered for download via CTA).
--      Default FALSE — existing rows are inline media, no backfill needed.
--   2. EXTEND type CHECK constraint with 'document' (PDF, DOCX, PPTX, XLS) and
--      'audio' (MP3, WAV, AAC) so downloadable assets can be typed correctly.
--
-- RLS unchanged: is_downloadable is a business-logic flag, not a security
-- boundary. Existing tenant_isolation policies on media_items continue to
-- govern access.
--
-- Verification:
--   -- Column exists with correct default:
--   SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'media_items' AND column_name = 'is_downloadable';
--   -- Constraint accepts new types:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'media_items_type_check';
--   -- Tenant isolation still enforced:
--   SET ROLE anon; SELECT * FROM media_items; RESET ROLE; -- 0 rows
--

-- 1) Add is_downloadable flag
ALTER TABLE public.media_items
  ADD COLUMN is_downloadable BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Extend type CHECK constraint to include 'document' and 'audio'
ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS media_items_type_check;

ALTER TABLE public.media_items
  ADD CONSTRAINT media_items_type_check
  CHECK (type IN ('image', 'video', 'youtube', 'vimeo', 'instagram', 'tiktok', 'document', 'audio'));
