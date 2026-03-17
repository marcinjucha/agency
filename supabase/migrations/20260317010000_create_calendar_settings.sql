-- Per-user calendar availability settings
-- Stores work hours, slot duration, and buffer time for appointment booking

CREATE TABLE calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_start_hour INTEGER NOT NULL DEFAULT 9 CHECK (work_start_hour >= 0 AND work_start_hour <= 23),
  work_end_hour INTEGER NOT NULL DEFAULT 17 CHECK (work_end_hour >= 0 AND work_end_hour <= 23),
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 480),
  buffer_minutes INTEGER NOT NULL DEFAULT 15 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_calendar_settings UNIQUE (user_id),
  CONSTRAINT valid_work_hours CHECK (work_end_hour > work_start_hour)
);

ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- Users manage only their own settings (no cross-tenant data needed — per-user scope)
CREATE POLICY "Users can manage own calendar settings"
  ON calendar_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Seed defaults for existing users
INSERT INTO calendar_settings (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Verification:
-- SELECT * FROM calendar_settings;
-- SET ROLE authenticated; SET request.jwt.claims = '{"sub": "<user-id>"}'; SELECT * FROM calendar_settings; RESET ROLE;
