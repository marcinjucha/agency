-- ==========================================
-- Seed the HYBRID venture bonus email copy template (email_templates type 'venture_bonus')
-- ==========================================
-- Phase 3 (docs/EMAIL_TEMPLATE_ARCHITECTURE.md). Makes the SURROUNDING COPY of the
-- venture bonus email editable in the CMS while the dynamic bonus LIST stays
-- rendered programmatically at send (spliced at the {{bonus_list}} marker).
--
-- The copy blocks below reproduce the CURRENT hardcoded bonus-email copy
-- (features/venture/mail/bonus-email.ts) VERBATIM so that, for the same bonuses,
-- the hybrid render is BYTE-IDENTICAL to today's output FOR THE SEEDED STATIC COPY
-- (which contains no ' or " — the only chars whose entity encoding differs between
-- the escapeHtml body path and React's JSX escaping). Runtime {{companyName}}
-- substitution of a brand containing ' or " is SEMANTICALLY equivalent (both paths
-- escape it — no raw quote leaks) but may differ in entity FORM (&#39; vs &#x27;),
-- so it is NOT asserted byte-for-byte. Regression guard:
-- features/venture/__tests__/bonus-email-template.test.ts. Blocks are themeless
-- + tokenised — the send path overlays the dynamically-resolved
-- campaign→client→tenant theme by role (client-theming preserved). theme_id stays
-- NULL: the venture path IGNORES per-template theme and applies the resolved
-- per-campaign theme instead.
--
-- Marker convention: the text block whose content is exactly '{{bonus_list}}'
-- pins WHERE the programmatic list is spliced (here: between intro and inbox-note
-- = today's list position). Removing it degrades to before-footer (list never
-- dropped).
--
-- Idempotent (INSERT ... SELECT ... WHERE NOT EXISTS) — safe to re-run. Uses a
-- NOT EXISTS guard rather than ON CONFLICT: the (tenant_id, type) uniqueness is not
-- reliably inferable as an ON CONFLICT arbiter on this DB, so guard explicitly.
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.
-- No schema change (type CHECK was dropped in 20260513120000; theme_id added in
-- 20260713120000) → no type regeneration needed.

INSERT INTO email_templates (tenant_id, type, label, subject, blocks, template_variables, theme_id)
SELECT
  '19342448-4e4e-49ba-8bf0-694d5376f953'::uuid, -- Halo Efekt tenant (hardcoded, stable non-secret id)
  'venture_bonus',
  'Mail bonusowy (venture)', -- label NOT NULL (20260514120000) — human-readable name in the CMS list
  'Twoje bonusy od {{companyName}}',
  '[
    {"id":"bonus-header","type":"header","companyName":"{{companyName}}","textColor":"#ffffff"},
    {"id":"bonus-heading","type":"heading","text":"Twoje bonusy są gotowe","level":"h2","color":"#1a1a2e"},
    {"id":"bonus-intro","type":"text","content":"<p>Dziękujemy! Poniżej znajdziesz materiały, które dla Ciebie przygotowaliśmy.</p>"},
    {"id":"bonus-list-marker","type":"text","content":"{{bonus_list}}"},
    {"id":"bonus-inbox-note","type":"text","content":"<p>Sprawdź swoją skrzynkę — wkrótce odezwiemy się z informacją o starcie.</p>"},
    {"id":"bonus-footer","type":"footer","text":"Wiadomość wysłana automatycznie przez {{companyName}}. Prosimy nie odpowiadać na ten email."}
  ]'::jsonb,
  '[
    {"key":"companyName","label":"Nazwa marki","description":"Wyświetlana w nagłówku, tytule i stopce."},
    {"key":"bonus_list","label":"Lista bonusów","description":"Wstawiana automatycznie w miejscu tego znacznika — nie edytuj ręcznie."}
  ]'::jsonb,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates
  WHERE tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953' AND type = 'venture_bonus'
);
