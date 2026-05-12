-- AAA-T-221: Email templates — explicit variable registry + relax type CHECK
--
-- Changes:
--   1. ADD COLUMN template_variables JSONB NOT NULL DEFAULT '[]'
--      Stores explicit registry of variables consumed by a given template
--      ({key, label, description?, defaultValue?}). The workflow editor reads
--      this list to render the variable_bindings UI, instead of grepping the
--      HTML body for {{handlebars}}.
--
--   2. DROP CONSTRAINT email_templates_type_check
--      Original CHECK restricted `type` to 'form_confirmation' only. CMS code
--      already produces additional types (e.g. 'workflow_custom') so the CHECK
--      is too strict and was blocking inserts. Type validation is enforced in
--      the application layer (Zod) instead.
--
-- RLS: no changes — new column inherits existing tenant_isolation policies
--      via current_user_tenant_id().
--
-- Verification:
--   \d email_templates
--   SELECT column_name, data_type, column_default
--     FROM information_schema.columns
--     WHERE table_name = 'email_templates' AND column_name = 'template_variables';
--   SELECT conname FROM pg_constraint
--     WHERE conrelid = 'email_templates'::regclass AND contype = 'c';

-- 1. New column for explicit variable registry
--    Two-step pattern: ADD COLUMN IF NOT EXISTS (idempotent), then enforce
--    NOT NULL + DEFAULT separately. Direct `ADD COLUMN ... NOT NULL` is skipped
--    by IF NOT EXISTS if the column was pre-created without the constraint
--    (e.g. via an earlier ad-hoc ALTER), leaving the column nullable.
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '[]'::jsonb;

UPDATE email_templates
  SET template_variables = '[]'::jsonb
  WHERE template_variables IS NULL;

ALTER TABLE email_templates
  ALTER COLUMN template_variables SET DEFAULT '[]'::jsonb,
  ALTER COLUMN template_variables SET NOT NULL;

COMMENT ON COLUMN email_templates.template_variables IS
  'Array of {key, label, description?, defaultValue?} — explicit variable registry consumed by workflow editor for variable_bindings UI';

-- 2. Drop overly-restrictive type CHECK constraint
ALTER TABLE email_templates
  DROP CONSTRAINT IF EXISTS email_templates_type_check;
