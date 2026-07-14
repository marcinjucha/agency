-- ==========================================
-- Fix venture_bonus heading block missing `color` (Bug A regression)
-- ==========================================
-- The seed migration 20260714120000 originally shipped the `venture_bonus`
-- email template's heading block (blocks[1]) WITHOUT a `color` field (a prior
-- "dead-data cleanup" dropped it). But the email block registry requires
-- `heading.color` (apps/cms/features/email/block-registry.ts:148 —
-- `color: hexColorSchema`, mirrored in features/email/validation.ts headingSchema).
-- Consequence: opening the seeded template in the CMS editor and saving fails
-- Zod validation with `invalid_type … path ["data","blocks",1,"color"] Required`,
-- so the template could NEVER be saved.
--
-- The seed row is ALREADY present on staging and the seed uses `WHERE NOT EXISTS`,
-- so re-running the (now-fixed) seed will NOT touch the existing row. This
-- migration patches the existing row in place: it injects the heading default
-- color `#1a1a2e` into blocks[1] ONLY when that block is a heading AND has no
-- `color` yet. Idempotent — a row that already has the color is left untouched.
--
-- `#1a1a2e` is the heading default the renderer applied anyway (see
-- resolveClientTheme HALO_EFEKT_DEFAULT note), so this does NOT change the
-- rendered output — it only makes the stored JSONB pass the update schema.
--
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit
-- approval. No schema change → no type regeneration needed.

UPDATE email_templates
SET blocks = jsonb_set(blocks, '{1,color}', '"#1a1a2e"')
WHERE tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953'
  AND type = 'venture_bonus'
  AND blocks->1->>'type' = 'heading'
  AND NOT (blocks->1 ? 'color');
