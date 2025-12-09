-- Fix recursion in tenant policies too
-- The tenant policies were also querying users table, contributing to recursion

-- Drop existing tenant policies
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update own tenant" ON tenants;

-- Recreate with proper isolation
-- Now that users table has non-recursive policies, these should work
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (
    id = (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  USING (
    id = (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    id = (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- These are the same queries, but now the users policies won't cause recursion
-- because users policies check by id first (auth.uid()) before checking tenant_id
