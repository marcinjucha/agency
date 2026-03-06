-- Require client_email on survey_links
-- Email is needed for automated notifications (form_confirmation workflow)

-- Remove links without email (dev data only — production should never have these)
DELETE FROM survey_links WHERE client_email IS NULL;

-- Enforce at DB level
ALTER TABLE survey_links ALTER COLUMN client_email SET NOT NULL;
