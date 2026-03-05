-- Rename lawyer_id to user_id in appointments table
-- Reason: Company pivot from legal-specific to general business automation (Halo Efekt)

ALTER TABLE appointments RENAME COLUMN lawyer_id TO user_id;

ALTER INDEX idx_appointments_lawyer RENAME TO idx_appointments_user;

COMMENT ON COLUMN appointments.user_id IS 'User (business account holder) who owns this appointment';
