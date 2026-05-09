-- AAA-T-63 Iter 3 — drop appointments.client_name/client_email/notes
--
-- These columns were the original (pre-AAA-T-63) source of truth for client
-- identity on the booking row. After Iter 1+2, the website derives client
-- name/email from `responses.answers` JSONB via `semantic_role` markers, and
-- the CMS appointment view derives them at query time via the same join.
-- The columns are no longer read by any code path.
--
-- `notes` was never displayed in the UI (verified via grep, AAA-T-63 Iter 2
-- audit) and was always written as NULL by the booking insert post-Commit 9.
--
-- Apply order: this migration MUST run AFTER Iter 1 (a2998fc) and Iter 2
-- (35fff46) are deployed to the same environment. Pre-existing legacy rows
-- with response_id IS NULL must be deleted before applying — the join cannot
-- recover their client info, and after this migration the columns are gone.

ALTER TABLE appointments
  DROP COLUMN client_name,
  DROP COLUMN client_email,
  DROP COLUMN notes;
