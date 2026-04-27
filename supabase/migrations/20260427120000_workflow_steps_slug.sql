-- ============================================================
-- AAA-T-206 Iteration 1: workflow_steps.slug
-- ============================================================
--
-- Adds a per-workflow user-editable slug to workflow_steps so both
-- CMS and n8n can reference step outputs by a stable key (instead of
-- positional `step1`, `step2` derived from topological sort, which
-- breaks under fork topologies).
--
-- Backfill rule: for each (workflow_id, step_type) group, the first
-- row (by created_at, id) gets the bare camelCase slug
-- (e.g. `aiAction`); subsequent rows get a numeric suffix
-- (`aiAction2`, `aiAction3`, ...).
--
-- Verification (after migration runs, both queries must return zero rows):
--
--   -- 1) No duplicate slugs within a workflow
--   SELECT workflow_id, slug, count(*)
--   FROM workflow_steps
--   GROUP BY 1, 2
--   HAVING count(*) > 1;
--
--   -- 2) No NULL slugs
--   SELECT count(*) FROM workflow_steps WHERE slug IS NULL;
--
-- Sanity check for backfill (two `ai_action` rows in same workflow
-- should yield `aiAction` and `aiAction2`):
--
--   SELECT workflow_id, step_type, slug, created_at
--   FROM workflow_steps
--   WHERE step_type = 'ai_action'
--   ORDER BY workflow_id, created_at, id;
--
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add nullable slug column (backfill happens before NOT NULL)
-- ------------------------------------------------------------
ALTER TABLE workflow_steps
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- ------------------------------------------------------------
-- 2. Helper: snake_case -> camelCase
--    `get_response` -> `getResponse`, `ai_action` -> `aiAction`
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.to_camel_case(snake TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts TEXT[];
  result TEXT;
  i INT;
BEGIN
  IF snake IS NULL OR snake = '' THEN
    RETURN snake;
  END IF;

  parts := string_to_array(snake, '_');
  result := lower(parts[1]);

  FOR i IN 2..array_length(parts, 1) LOOP
    IF parts[i] <> '' THEN
      result := result
        || upper(substr(parts[i], 1, 1))
        || lower(substr(parts[i], 2));
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- ------------------------------------------------------------
-- 3. Backfill existing rows
-- ------------------------------------------------------------
WITH numbered AS (
  SELECT
    id,
    pg_temp.to_camel_case(step_type) AS base_slug,
    row_number() OVER (
      PARTITION BY workflow_id, step_type
      ORDER BY created_at, id
    ) AS n
  FROM workflow_steps
)
UPDATE workflow_steps ws
SET slug = CASE
  WHEN numbered.n = 1 THEN numbered.base_slug
  ELSE numbered.base_slug || numbered.n::text
END
FROM numbered
WHERE ws.id = numbered.id;

-- ------------------------------------------------------------
-- 4. Enforce NOT NULL
-- ------------------------------------------------------------
ALTER TABLE workflow_steps
  ALTER COLUMN slug SET NOT NULL;

-- ------------------------------------------------------------
-- 5. Unique slug per workflow
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS workflow_steps_workflow_id_slug_key
  ON workflow_steps (workflow_id, slug);

-- ------------------------------------------------------------
-- 6. Slug format check: camelCase, alphanumeric only,
--    starts with lowercase letter
-- ------------------------------------------------------------
ALTER TABLE workflow_steps
  ADD CONSTRAINT workflow_steps_slug_format_check
  CHECK (slug ~ '^[a-z][a-zA-Z0-9]*$');
