-- Email templates — add `label` column for human-readable template name.
--
-- AAA-T-221 follow-up: enable users to create custom email templates from CMS.
-- Previously templates were keyed only by `type` slug; labels lived in TS code
-- (`TEMPLATE_TYPE_LABELS`). Moving labels to DB unlocks DB-driven list rendering
-- and user-defined template types.
--
-- Backfill values for existing rows match the legacy TEMPLATE_TYPE_LABELS map.
-- Any other pre-existing types fall back to their slug (rare, but defensive).
--
-- Defensive pattern (per AAA-T-221 memory.md): ADD IF NOT EXISTS + UPDATE WHERE
-- IS NULL + SET NOT NULL as separate statements — local DB may already have
-- the column from an ad-hoc ALTER, in which case the inline NOT NULL is skipped.
--
-- Verification:
--   \d email_templates
--   SELECT type, label FROM email_templates ORDER BY type;

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS label TEXT;

UPDATE email_templates
  SET label = CASE type
    WHEN 'form_confirmation' THEN 'Potwierdzenie formularza'
    WHEN 'workflow_custom'   THEN 'Szablon workflow'
    ELSE type
  END
  WHERE label IS NULL;

ALTER TABLE email_templates
  ALTER COLUMN label SET NOT NULL;

COMMENT ON COLUMN email_templates.label IS
  'Human-readable template name shown in CMS. Editable per template.';
