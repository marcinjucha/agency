-- Add instagram and tiktok to media_items type CHECK constraint
ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS media_items_type_check;

ALTER TABLE public.media_items
  ADD CONSTRAINT media_items_type_check
  CHECK (type IN ('image', 'video', 'youtube', 'vimeo', 'instagram', 'tiktok'));
