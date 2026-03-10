-- DocForge license management
-- Managed via CMS (legal-mind admin panel)

CREATE TABLE docforge_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  client_name TEXT,
  email TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- No direct access — only via RPC
ALTER TABLE docforge_licenses ENABLE ROW LEVEL SECURITY;

-- Verify license key — callable with anon key, bypasses RLS
CREATE OR REPLACE FUNCTION verify_docforge_license(license_key TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'valid', (is_active AND (expires_at IS NULL OR expires_at > now())),
    'expires_at', expires_at,
    'client_name', client_name
  ) INTO result
  FROM docforge_licenses
  WHERE key = license_key;

  IF result IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Key not found');
  END IF;

  RETURN result;
END;
$$;
