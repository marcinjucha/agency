-- DocForge License Management: seats, activations, RLS policies
-- AAA-T-171: CMS admin panel for DocForge desktop app licenses
--
-- Changes:
--   1. ALTER docforge_licenses: add max_seats, grace_days columns
--   2. CREATE docforge_activations table (machine tracking)
--   3. RLS policies on both tables (is_super_admin() only)
--   4. REPLACE verify_docforge_license with seat-aware version
--
-- Verification:
--   1. supabase db reset
--   2. SET ROLE anon; SELECT verify_docforge_license('test-key', 'machine-1');
--   3. SET ROLE authenticated; SELECT * FROM docforge_licenses; -- should fail without super_admin
--   4. npm run db:types
--   5. grep "docforge_activations" packages/database/src/types.ts

-- ==========================================
-- 1. Add seat management columns to docforge_licenses
-- ==========================================

ALTER TABLE docforge_licenses
  ADD COLUMN max_seats INTEGER NOT NULL DEFAULT 1;

ALTER TABLE docforge_licenses
  ADD COLUMN grace_days INTEGER NOT NULL DEFAULT 7;

-- ==========================================
-- 2. Create docforge_activations table
-- ==========================================

CREATE TABLE docforge_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES docforge_licenses(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  machine_name TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(license_id, machine_id)
);

CREATE INDEX idx_docforge_activations_license_id
  ON docforge_activations(license_id);

ALTER TABLE docforge_activations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS policies: is_super_admin() only (both tables)
-- ==========================================
-- Pattern: is_super_admin() is SECURITY DEFINER + STABLE, safe in RLS (no recursion risk)
-- No tenant_id — DocForge is cross-tenant, super admin only

CREATE POLICY "Super admin full access"
  ON docforge_licenses FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin full access"
  ON docforge_activations FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ==========================================
-- 4. Replace verify_docforge_license with seat-aware version
-- ==========================================
-- SECURITY DEFINER: bypasses RLS (desktop app calls as anon)
-- New signature: (p_license_key TEXT, p_machine_id TEXT)
-- No backward compatibility needed (pre-launch)

DROP FUNCTION IF EXISTS verify_docforge_license(TEXT);

CREATE OR REPLACE FUNCTION verify_docforge_license(p_license_key TEXT, p_machine_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license RECORD;
  v_active_seats INTEGER;
  v_existing_activation UUID;
  v_is_valid BOOLEAN;
BEGIN
  -- Find active license
  SELECT id, client_name, expires_at, is_active, max_seats, grace_days
    INTO v_license
    FROM docforge_licenses
    WHERE key = p_license_key;

  -- License not found
  IF v_license IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'key_not_found');
  END IF;

  -- Check if license is active and not expired
  v_is_valid := v_license.is_active
    AND (v_license.expires_at IS NULL OR v_license.expires_at > now());

  IF NOT v_is_valid THEN
    RETURN json_build_object(
      'valid', false,
      'expires_at', v_license.expires_at,
      'client_name', v_license.client_name,
      'max_seats', v_license.max_seats,
      'grace_days', v_license.grace_days,
      'error', 'license_inactive_or_expired'
    );
  END IF;

  -- Count current active activations
  SELECT COUNT(*) INTO v_active_seats
    FROM docforge_activations
    WHERE license_id = v_license.id AND is_active = true;

  -- Check if this machine already has an activation
  SELECT id INTO v_existing_activation
    FROM docforge_activations
    WHERE license_id = v_license.id AND machine_id = p_machine_id AND is_active = true;

  -- Existing activation: update last_seen_at
  IF v_existing_activation IS NOT NULL THEN
    UPDATE docforge_activations
      SET last_seen_at = now()
      WHERE id = v_existing_activation;

    RETURN json_build_object(
      'valid', true,
      'expires_at', v_license.expires_at,
      'client_name', v_license.client_name,
      'max_seats', v_license.max_seats,
      'active_seats', v_active_seats,
      'grace_days', v_license.grace_days
    );
  END IF;

  -- New machine: check seat limit
  IF v_active_seats >= v_license.max_seats THEN
    RETURN json_build_object(
      'valid', false,
      'expires_at', v_license.expires_at,
      'client_name', v_license.client_name,
      'max_seats', v_license.max_seats,
      'active_seats', v_active_seats,
      'grace_days', v_license.grace_days,
      'error', 'seat_limit_reached'
    );
  END IF;

  -- New machine with available seat: create activation
  INSERT INTO docforge_activations (license_id, machine_id)
    VALUES (v_license.id, p_machine_id);

  RETURN json_build_object(
    'valid', true,
    'expires_at', v_license.expires_at,
    'client_name', v_license.client_name,
    'max_seats', v_license.max_seats,
    'active_seats', v_active_seats + 1,
    'grace_days', v_license.grace_days
  );
END;
$$;

-- Grant execute to anon (desktop app) and authenticated (CMS)
GRANT EXECUTE ON FUNCTION verify_docforge_license(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_docforge_license(TEXT, TEXT) TO authenticated;
