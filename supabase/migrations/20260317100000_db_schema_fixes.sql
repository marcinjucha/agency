-- Schema fixes: email_configs RLS subquery, appointments per-user RLS, survey_links column rename
--
-- 1. email_configs: Replace subquery with current_user_tenant_id() to eliminate recursion risk
-- 2. appointments: Per-lawyer private calendar — scope to user_id, not tenant_id
-- 3. survey_links: Rename client_email -> notification_email (reflects actual recipient: law firm, not client)
--
-- Verification:
--   SET ROLE authenticated;
--   SET request.jwt.claims = '{"sub": "user-uuid"}';
--   SELECT * FROM email_configs;
--   SELECT * FROM appointments;
--   RESET ROLE;
--   \d survey_links  -- confirm notification_email column exists

-- 1. Fix email_configs RLS: replace subquery with current_user_tenant_id()
DROP POLICY IF EXISTS "Users can view own tenant email configs" ON email_configs;
CREATE POLICY "Users can view own tenant email configs"
  ON email_configs FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- 2. Fix appointments RLS: per-lawyer private calendar (user_id scope, not tenant_id)
-- "Anyone can create appointments" is a public booking policy — preserve it
DROP POLICY IF EXISTS "Users can view own tenant appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage own tenant appointments" ON appointments;
CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can manage own appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Rename survey_links.client_email -> notification_email
-- Reason: email goes to the law firm (kancelaria), not the end client
ALTER TABLE survey_links RENAME COLUMN client_email TO notification_email;
COMMENT ON COLUMN survey_links.notification_email IS 'Law firm email receiving submission notifications — NOT the end client email';
