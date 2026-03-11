-- Create email_templates table for per-tenant email template management
-- Supports CMS-managed templates used by n8n Send Email subworkflow
--
-- Verification steps:
--   SELECT * FROM email_templates LIMIT 5;
--   SET ROLE authenticated; SELECT * FROM email_templates; RESET ROLE;
--   SET ROLE anon; SELECT * FROM email_templates; RESET ROLE; -- should return 0 rows

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('form_confirmation')),
  subject TEXT NOT NULL DEFAULT 'Dziękujemy za wypełnienie formularza',
  blocks JSONB NOT NULL DEFAULT '[]',
  html_body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, type)
);

-- updated_at trigger (reuses existing update_updated_at() function from initial schema)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users see only their tenant's templates
-- Uses current_user_tenant_id() helper (SECURITY DEFINER) — avoids RLS infinite recursion
CREATE POLICY "Users can view own tenant email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- INSERT: authenticated users can create templates for their own tenant
CREATE POLICY "Users can insert own tenant email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- UPDATE: authenticated users can update their own tenant's templates
CREATE POLICY "Users can update own tenant email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- DELETE: authenticated users can delete their own tenant's templates
CREATE POLICY "Users can delete own tenant email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- Seed default form_confirmation template for all existing tenants
-- ON CONFLICT DO NOTHING is idempotent — safe to re-run
INSERT INTO email_templates (tenant_id, type, subject, blocks)
SELECT
  t.id,
  'form_confirmation',
  'Dziękujemy za wypełnienie formularza - {{surveyTitle}}',
  '[
    {"id":"h1","type":"header","companyName":"{{companyName}}","backgroundColor":"#1a1a2e","textColor":"#ffffff"},
    {"id":"t1","type":"text","content":"Szanowny/a <strong>{{clientName}}</strong>,\n\nDziękujemy za wypełnienie formularza <strong>{{surveyTitle}}</strong>.\n\nOtrzymaliśmy Twoje zgłoszenie i wkrótce się z Tobą skontaktujemy."},
    {"id":"d1","type":"divider","color":"#e5e7eb"},
    {"id":"f1","type":"footer","text":"Wiadomość wysłana automatycznie. Prosimy nie odpowiadać na ten email."}
  ]'::jsonb
FROM tenants t
ON CONFLICT (tenant_id, type) DO NOTHING;
