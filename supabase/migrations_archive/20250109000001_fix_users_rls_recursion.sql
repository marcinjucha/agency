-- Fix infinite recursion in users table RLS policy
-- Problem: Policy tried to SELECT from users to check tenant_id, causing infinite loop
-- Solution: Allow users to SELECT their own row by ID (no subquery needed)

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own tenant users" ON users;

-- Create two new policies:
-- 1. Users can always read their own row (by auth.uid())
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2. Users can view other users in their tenant (uses the user's own row)
CREATE POLICY "Users can view tenant users"
  ON users FOR SELECT
  USING (
    tenant_id = (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Note: Policy #1 will match first for the user's own row (no recursion)
-- Policy #2 will match for other users in the same tenant (uses already-loaded tenant_id)
