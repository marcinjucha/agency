-- Workflow Engine schema — Iteration 1/11
-- Creates 5 tables (workflows, workflow_steps, workflow_edges, workflow_executions, workflow_step_executions)
-- Modifies email_templates (add workflow_custom type, template_variables, name columns)
--
-- Verification steps:
--   supabase db reset
--   SELECT * FROM workflows LIMIT 1;
--   SELECT * FROM workflow_steps LIMIT 1;
--   SELECT * FROM workflow_edges LIMIT 1;
--   SELECT * FROM workflow_executions LIMIT 1;
--   SELECT * FROM workflow_step_executions LIMIT 1;
--   SET ROLE authenticated; SELECT * FROM workflows; RESET ROLE;
--   SET ROLE anon; SELECT * FROM workflows; RESET ROLE; -- should return 0 rows

-- ============================================================
-- SECTION 1: email_templates modifications
-- ============================================================

-- Drop existing CHECK constraint on type (auto-named by PostgreSQL)
ALTER TABLE email_templates DROP CONSTRAINT email_templates_type_check;

-- Add new CHECK allowing workflow_custom type
ALTER TABLE email_templates ADD CONSTRAINT email_templates_type_check
  CHECK (type IN ('form_confirmation', 'workflow_custom'));

-- Add template_variables column (declares available {{variables}} for workflow templates)
ALTER TABLE email_templates ADD COLUMN template_variables JSONB DEFAULT '[]';

-- Add name column (human-readable name for workflow templates)
ALTER TABLE email_templates ADD COLUMN name TEXT;

-- Drop existing UNIQUE(tenant_id, type) — system types stay unique, workflow_custom allows many
ALTER TABLE email_templates DROP CONSTRAINT email_templates_tenant_id_type_key;

-- Partial unique index: system types (non-workflow_custom) remain 1-per-tenant
CREATE UNIQUE INDEX email_templates_tenant_type_system_unique
  ON email_templates (tenant_id, type)
  WHERE type != 'workflow_custom';

-- ============================================================
-- SECTION 2: workflows table
-- ============================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_tenant_id ON workflows (tenant_id);
CREATE INDEX idx_workflows_active_trigger ON workflows (tenant_id, trigger_type) WHERE is_active = true;

-- updated_at trigger (reuses existing update_updated_at() from initial schema)
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can insert own tenant workflows"
  ON workflows FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update own tenant workflows"
  ON workflows FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can delete own tenant workflows"
  ON workflows FOR DELETE
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- ============================================================
-- SECTION 3: workflow_steps table
-- ============================================================

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL,
  step_config JSONB NOT NULL DEFAULT '{}',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps (workflow_id);

-- updated_at trigger
CREATE TRIGGER update_workflow_steps_updated_at
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS via join to workflows (tenant isolation through parent)
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant workflow steps"
  ON workflow_steps FOR SELECT
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

CREATE POLICY "Users can insert own tenant workflow steps"
  ON workflow_steps FOR INSERT
  TO authenticated
  WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

CREATE POLICY "Users can update own tenant workflow steps"
  ON workflow_steps FOR UPDATE
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()))
  WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

CREATE POLICY "Users can delete own tenant workflow steps"
  ON workflow_steps FOR DELETE
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

-- ============================================================
-- SECTION 4: workflow_edges table
-- ============================================================

CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  target_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  condition_branch TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, source_step_id, target_step_id)
);

CREATE INDEX idx_workflow_edges_workflow_id ON workflow_edges (workflow_id);
CREATE INDEX idx_workflow_edges_source_step ON workflow_edges (source_step_id);

-- RLS via join to workflows (same pattern as workflow_steps)
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant workflow edges"
  ON workflow_edges FOR SELECT
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

CREATE POLICY "Users can insert own tenant workflow edges"
  ON workflow_edges FOR INSERT
  TO authenticated
  WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

CREATE POLICY "Users can update own tenant workflow edges"
  ON workflow_edges FOR UPDATE
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()))
  WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

CREATE POLICY "Users can delete own tenant workflow edges"
  ON workflow_edges FOR DELETE
  TO authenticated
  USING (workflow_id IN (SELECT id FROM workflows WHERE tenant_id = public.current_user_tenant_id()));

-- ============================================================
-- SECTION 5: workflow_executions table
-- ============================================================

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_payload JSONB NOT NULL DEFAULT '{}',
  triggering_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions (workflow_id);
CREATE INDEX idx_workflow_executions_tenant_status ON workflow_executions (tenant_id, status, started_at DESC);
CREATE INDEX idx_workflow_executions_tenant_created ON workflow_executions (tenant_id, created_at);

-- RLS: SELECT ONLY for authenticated (read-only — n8n uses service_role for writes)
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant workflow executions"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_user_tenant_id());

-- ============================================================
-- SECTION 6: workflow_step_executions table
-- ============================================================

CREATE TABLE workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_step_executions_execution_id ON workflow_step_executions (execution_id);
CREATE INDEX idx_workflow_step_executions_step_id ON workflow_step_executions (step_id);
CREATE INDEX idx_workflow_step_executions_exec_status ON workflow_step_executions (execution_id, status);

-- RLS: SELECT ONLY via join to workflow_executions (read-only for CMS users)
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant workflow step executions"
  ON workflow_step_executions FOR SELECT
  TO authenticated
  USING (execution_id IN (SELECT id FROM workflow_executions WHERE tenant_id = public.current_user_tenant_id()));
