-- Add 'no_show' to appointments status CHECK constraint
--
-- The original constraint was defined inline in 20250105000001_initial_schema.sql:
--   status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled'))
-- PostgreSQL auto-named it appointments_status_check.
--
-- TypeScript types (apps/cms/features/appointments/types.ts) already include 'no_show'.
-- Without this migration any UPDATE/INSERT with status='no_show' raises a constraint violation.

ALTER TABLE appointments
  DROP CONSTRAINT appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'));

-- Verification:
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conrelid = 'appointments'::regclass
--    AND contype = 'c';
-- Expected: appointments_status_check  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'))
