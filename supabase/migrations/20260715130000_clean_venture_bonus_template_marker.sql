-- ==========================================
-- Clean the venture bonus email template — remove the {{bonus_list}} marker
-- ==========================================
-- WHAT: For the seeded 'venture_bonus' email_templates row(s), drop the text block
-- whose content is exactly '{{bonus_list}}' from `blocks`, and drop the matching
-- '{"key":"bonus_list",...}' entry from `template_variables`.
--
-- WHY: The app no longer splices a programmatic bonus list at the marker (that
-- splice was removed on branch feature/email-template-variables). With no splicer,
-- the '{{bonus_list}}' token renders empty in the delivered mail and the
-- template_variables entry advertises a variable nothing fills. Per user decision,
-- ship a CLEAN template — no marker, no example blocks. The operator adds bonus-link
-- blocks + any variables they need directly in the CMS editor afterwards.
--
-- Shape: the seed (20260714120000_seed_venture_bonus_email_template.sql) stores the
-- marker as a FLAT top-level text block ("id":"bonus-list-marker") — no section
-- nesting — so a set-based top-level jsonb_agg rebuild is sufficient (no recursion).
--
-- Idempotent: the WHERE guard only matches rows that still contain the marker block
-- OR the bonus_list variable, so a re-run is a no-op. Scoped to type='venture_bonus'
-- + the Halo Efekt tenant (same scope as the seed). Touches no other template/column.
--
-- Content-only JSONB change → no schema change → no type regeneration needed.
-- Applied to STAGING (mqabjtxtywsmehzijmko) first — NEVER prod without explicit approval.

UPDATE email_templates AS et
SET
  blocks = COALESCE((
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(et.blocks) AS elem
    WHERE trim(COALESCE(elem ->> 'content', '')) <> '{{bonus_list}}'
  ), '[]'::jsonb),
  template_variables = COALESCE((
    SELECT jsonb_agg(v)
    FROM jsonb_array_elements(et.template_variables) AS v
    WHERE COALESCE(v ->> 'key', '') <> 'bonus_list'
  ), '[]'::jsonb)
WHERE et.type = 'venture_bonus'
  AND et.tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953'::uuid
  AND (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(et.blocks) AS b
      WHERE trim(COALESCE(b ->> 'content', '')) = '{{bonus_list}}'
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(et.template_variables) AS v
      WHERE COALESCE(v ->> 'key', '') = 'bonus_list'
    )
  );
