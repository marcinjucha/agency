-- Add DELETE RLS policy for responses table
-- Required for AAA-T-92: delete responses from CMS
-- Matches existing SELECT/UPDATE policies using current_user_tenant_id()

CREATE POLICY "Users can delete own tenant responses"
  ON responses FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());
