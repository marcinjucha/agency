-- Intake Hub schema changes (AAA-T-124)
--
-- 1. Extend responses.status CHECK constraint with 'client' and 'rejected' statuses
--    for Intake Hub pipeline: Nowy → Skwalifikowany → W kontakcie → Zamknięty
--    where 'client' and 'rejected' are closing sub-statuses.
--
-- 2. Add internal_notes column for CMS-side notes on responses (not visible to clients)
--
-- 3. Add status_changed_at column for sorting by last status transition
--    (set by application code on status change, not by trigger)
--
-- The original constraint was defined inline in 20250105000001_initial_schema.sql line 66:
--   status TEXT DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'disqualified', 'contacted'))
-- PostgreSQL auto-named it responses_status_check.
-- Pattern follows 20260317000000_add_no_show_appointment_status.sql.

-- 1. Extend status CHECK constraint
ALTER TABLE responses
  DROP CONSTRAINT responses_status_check;

ALTER TABLE responses
  ADD CONSTRAINT responses_status_check
    CHECK (status IN ('new', 'qualified', 'disqualified', 'contacted', 'client', 'rejected'));

-- 2. Add internal_notes column (nullable, no default)
ALTER TABLE responses
  ADD COLUMN internal_notes TEXT;

-- 3. Add status_changed_at column (nullable, set by application on status change)
ALTER TABLE responses
  ADD COLUMN status_changed_at TIMESTAMPTZ;

-- 4. Index on status_changed_at for sorting in Intake Hub pipeline
CREATE INDEX idx_responses_status_changed_at ON responses(status_changed_at);

-- Verification:
-- Check constraint:
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conrelid = 'responses'::regclass
--    AND contype = 'c';
-- Expected: responses_status_check  CHECK (status = ANY (ARRAY['new', 'qualified', 'disqualified', 'contacted', 'client', 'rejected']))
--
-- Check new columns:
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'responses'
--    AND column_name IN ('internal_notes', 'status_changed_at');
-- Expected: internal_notes TEXT nullable, status_changed_at timestamptz nullable
--
-- Check index:
-- SELECT indexname, indexdef
--   FROM pg_indexes
--  WHERE tablename = 'responses'
--    AND indexname = 'idx_responses_status_changed_at';
-- Expected: idx_responses_status_changed_at  CREATE INDEX ... ON responses USING btree (status_changed_at)
