-- Fix form_confirmation email template content direction.
-- Original seed (20260311000000) targeted the CLIENT ("Dziękujemy za wypełnienie...").
-- Correct behavior: template is a NOTIFICATION TO THE LAW FIRM about a new client submission.
-- Only updates templates that still match the old default content (preserves manual edits).

-- Step 1: Update existing templates that still contain the old client-facing default content
UPDATE email_templates
SET
  subject    = 'Nowe zgłoszenie - {{surveyTitle}}',
  blocks     = '[
    {"id":"h1","type":"header","companyName":"{{companyName}}","backgroundColor":"#1a1a2e","textColor":"#ffffff"},
    {"id":"t1","type":"text","content":"Otrzymałeś nowe zgłoszenie z formularza <strong>{{surveyTitle}}</strong>.<br/><br/>Klient: <strong>{{clientName}}</strong>"},
    {"id":"c1","type":"cta","label":"Zobacz zgłoszenie","url":"{{responseUrl}}","backgroundColor":"#1a1a2e","textColor":"#ffffff"},
    {"id":"d1","type":"divider","color":"#e5e7eb"},
    {"id":"f1","type":"footer","text":"Wiadomość wygenerowana automatycznie przez system Halo Efekt."}
  ]'::jsonb,
  html_body  = NULL,
  updated_at = now()
WHERE
  type = 'form_confirmation'
  AND (
    subject LIKE '%Dziękujemy%'
    OR blocks::text LIKE '%Dziękujemy za wypełnienie%'
    OR blocks::text LIKE '%wkrótce się z Tobą skontaktujemy%'
  );

-- Step 2: Insert the correct template for any tenants that don't have one yet
-- ON CONFLICT DO NOTHING — idempotent, safe to re-run
INSERT INTO email_templates (tenant_id, type, subject, blocks)
SELECT
  t.id,
  'form_confirmation',
  'Nowe zgłoszenie - {{surveyTitle}}',
  '[
    {"id":"h1","type":"header","companyName":"{{companyName}}","backgroundColor":"#1a1a2e","textColor":"#ffffff"},
    {"id":"t1","type":"text","content":"Otrzymałeś nowe zgłoszenie z formularza <strong>{{surveyTitle}}</strong>.<br/><br/>Klient: <strong>{{clientName}}</strong>"},
    {"id":"c1","type":"cta","label":"Zobacz zgłoszenie","url":"{{responseUrl}}","backgroundColor":"#1a1a2e","textColor":"#ffffff"},
    {"id":"d1","type":"divider","color":"#e5e7eb"},
    {"id":"f1","type":"footer","text":"Wiadomość wygenerowana automatycznie przez system Halo Efekt."}
  ]'::jsonb
FROM tenants t
ON CONFLICT (tenant_id, type) DO NOTHING;
