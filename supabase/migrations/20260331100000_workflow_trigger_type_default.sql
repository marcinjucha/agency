-- Allow workflows to be created without specifying trigger_type
-- Default to 'manual' — updated from canvas when user adds trigger node
ALTER TABLE workflows ALTER COLUMN trigger_type SET DEFAULT 'manual';
