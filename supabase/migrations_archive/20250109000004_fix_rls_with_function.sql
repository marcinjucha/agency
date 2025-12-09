-- Fix RLS recursion by using a cached function instead of subqueries
-- This prevents infinite recursion by evaluating the tenant_id once

-- Create a STABLE function that returns current user's tenant_id
-- STABLE means it's cached within a single query
-- SECURITY DEFINER means it runs with elevated privileges (bypasses RLS)
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.current_user_tenant_id() TO authenticated, anon;

-- Now recreate ALL policies using this function instead of subqueries

-- ==========================================
-- TENANTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update own tenant" ON tenants;

CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (id = public.current_user_tenant_id());

CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  USING (id = public.current_user_tenant_id())
  WITH CHECK (id = public.current_user_tenant_id());

-- ==========================================
-- USERS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view tenant users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view tenant users"
  ON users FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ==========================================
-- SURVEYS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own tenant surveys" ON surveys;
DROP POLICY IF EXISTS "Users can create surveys in own tenant" ON surveys;
DROP POLICY IF EXISTS "Users can update own tenant surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete own tenant surveys" ON surveys;

CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can create surveys in own tenant"
  ON surveys FOR INSERT
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update own tenant surveys"
  ON surveys FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can delete own tenant surveys"
  ON surveys FOR DELETE
  USING (tenant_id = public.current_user_tenant_id());

-- ==========================================
-- SURVEY_LINKS
-- ==========================================
DROP POLICY IF EXISTS "Users can manage own tenant survey links" ON survey_links;

CREATE POLICY "Users can manage own tenant survey links"
  ON survey_links FOR ALL
  USING (survey_id IN (
    SELECT id FROM surveys WHERE tenant_id = public.current_user_tenant_id()
  ));

-- ==========================================
-- RESPONSES
-- ==========================================
DROP POLICY IF EXISTS "Users can view own tenant responses" ON responses;
DROP POLICY IF EXISTS "Users can update own tenant responses" ON responses;

CREATE POLICY "Users can view own tenant responses"
  ON responses FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update own tenant responses"
  ON responses FOR UPDATE
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- ==========================================
-- APPOINTMENTS
-- ==========================================
DROP POLICY IF EXISTS "Users can view own tenant appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage own tenant appointments" ON appointments;

CREATE POLICY "Users can view own tenant appointments"
  ON appointments FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can manage own tenant appointments"
  ON appointments FOR ALL
  USING (tenant_id = public.current_user_tenant_id());

-- Comment explaining the solution
COMMENT ON FUNCTION public.current_user_tenant_id() IS
  'Returns the tenant_id for the current authenticated user. Used in RLS policies to prevent infinite recursion. SECURITY DEFINER allows it to bypass RLS when querying users table.';
