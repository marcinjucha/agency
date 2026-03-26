-- Add 'legal' page_type to pages table and seed legal pages for Halo Efekt
-- Supports Regulamin and Polityka Prywatności pages editable via CMS block editor
--
-- Verification steps:
--   SELECT page_type, slug, title FROM pages WHERE page_type = 'legal';
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'html_body';
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pages'::regclass AND contype = 'c';

-- 1. Drop existing CHECK constraint and add new one including 'legal'
ALTER TABLE pages DROP CONSTRAINT pages_page_type_check;
ALTER TABLE pages ADD CONSTRAINT pages_page_type_check
  CHECK (page_type IN ('page', 'landing', 'blog_listing', 'blog_post_template', 'legal'));

-- 2. Add html_body column for pre-rendered HTML (used by blog_post_template and legal pages)
ALTER TABLE pages ADD COLUMN html_body TEXT;

-- 3. Seed legal pages for tenant Halo Efekt
INSERT INTO pages (tenant_id, slug, title, page_type, blocks, html_body, is_published)
VALUES
  (
    '19342448-4e4e-49ba-8bf0-694d5376f953',
    'regulamin',
    'Regulamin',
    'legal',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Treść zostanie uzupełniona."}]}]}'::jsonb,
    '<p>Treść zostanie uzupełniona.</p>',
    true
  ),
  (
    '19342448-4e4e-49ba-8bf0-694d5376f953',
    'polityka-prywatnosci',
    'Polityka Prywatności',
    'legal',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Treść zostanie uzupełniona."}]}]}'::jsonb,
    '<p>Treść zostanie uzupełniona.</p>',
    true
  )
ON CONFLICT (tenant_id, slug) DO NOTHING;
