-- Email provider configuration per tenant
CREATE TABLE email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'resend',
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE email_configs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view their own tenant's email config
CREATE POLICY "Users can view own tenant email configs"
  ON email_configs FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Only service role can insert/update/delete (n8n + admin)
