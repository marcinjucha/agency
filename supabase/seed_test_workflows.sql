-- Test workflows for n8n Orchestrator verification (AAA-T-183)
-- Run: psql -f supabase/seed_test_workflows.sql
-- Or: paste into Supabase SQL Editor (local: http://localhost:54323/project/default/sql)
--
-- Creates 5 test workflows covering all step types:
--   1. Linear (send_email → ai_action)
--   2. Condition Branch (condition → true/false email)
--   3. Delay Step (delay → send_email)
--   4. Webhook + Condition (webhook → condition → send_email)
--   5. Full Pipeline (condition → ai_action → condition → email/delay branch)
--
-- Cleanup: DELETE FROM workflows WHERE name LIKE 'Test:%' AND tenant_id = '19342448-4e4e-49ba-8bf0-694d5376f953';

DO $$
DECLARE
  v_tenant_id UUID := '19342448-4e4e-49ba-8bf0-694d5376f953';

  -- Workflow 1: Linear (email + AI)
  wf1_id UUID := gen_random_uuid();
  wf1_s1_id UUID := gen_random_uuid();
  wf1_s2_id UUID := gen_random_uuid();

  -- Workflow 2: Condition Branch
  wf2_id UUID := gen_random_uuid();
  wf2_s1_id UUID := gen_random_uuid();
  wf2_s2_id UUID := gen_random_uuid();
  wf2_s3_id UUID := gen_random_uuid();

  -- Workflow 3: Delay Step
  wf3_id UUID := gen_random_uuid();
  wf3_s1_id UUID := gen_random_uuid();
  wf3_s2_id UUID := gen_random_uuid();

  -- Workflow 4: Webhook + Condition
  wf4_id UUID := gen_random_uuid();
  wf4_s1_id UUID := gen_random_uuid();
  wf4_s2_id UUID := gen_random_uuid();
  wf4_s3_id UUID := gen_random_uuid();

  -- Workflow 5: Full Pipeline
  wf5_id UUID := gen_random_uuid();
  wf5_s1_id UUID := gen_random_uuid();
  wf5_s2_id UUID := gen_random_uuid();
  wf5_s3_id UUID := gen_random_uuid();
  wf5_s4_id UUID := gen_random_uuid();
  wf5_s5_id UUID := gen_random_uuid();

BEGIN
  -- Guard: only insert if tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE NOTICE 'Tenant % not found, skipping test workflow seed', v_tenant_id;
    RETURN;
  END IF;

  -- Clean up previous test workflows (idempotent re-run)
  DELETE FROM workflows WHERE name LIKE 'Test:%' AND tenant_id = v_tenant_id;

  -- ============================================================
  -- WORKFLOW 1: Linear (email + AI)
  -- manual → send_email → ai_action
  -- ============================================================

  INSERT INTO workflows (id, tenant_id, name, description, trigger_type, trigger_config, is_active)
  VALUES (
    wf1_id, v_tenant_id,
    'Test: Linear (email + AI)',
    'Two sequential steps: send email then AI action. Tests basic linear execution.',
    'manual', '{}', true
  );

  INSERT INTO workflow_steps (id, workflow_id, step_type, step_config, position_x, position_y) VALUES
    (wf1_s1_id, wf1_id, 'send_email', '{
      "template_id": null,
      "to": "test@example.com",
      "subject": "Test {{trigger_type}}",
      "html_body": "<p>Hello from workflow</p>"
    }', 0, 0),
    (wf1_s2_id, wf1_id, 'ai_action', '{
      "prompt": "Summarize: trigger was {{trigger_type}}",
      "output_schema": [
        {"key": "summary", "label": "Summary", "type": "string"}
      ]
    }', 300, 0);

  INSERT INTO workflow_edges (id, workflow_id, source_step_id, target_step_id, condition_branch, sort_order)
  VALUES (gen_random_uuid(), wf1_id, wf1_s1_id, wf1_s2_id, NULL, 0);

  -- ============================================================
  -- WORKFLOW 2: Condition Branch
  -- manual → condition → (true) email / (false) email
  -- ============================================================

  INSERT INTO workflows (id, tenant_id, name, description, trigger_type, trigger_config, is_active)
  VALUES (
    wf2_id, v_tenant_id,
    'Test: Condition Branch',
    'Condition step with true/false branching to different emails. Tests condition evaluation and edge routing.',
    'manual', '{}', true
  );

  INSERT INTO workflow_steps (id, workflow_id, step_type, step_config, position_x, position_y) VALUES
    (wf2_s1_id, wf2_id, 'condition', '{
      "type": "condition",
      "expression": "trigger_type == manual"
    }', 0, 0),
    (wf2_s2_id, wf2_id, 'send_email', '{
      "to": "true-branch@example.com",
      "subject": "Condition was TRUE",
      "html_body": "<p>True branch</p>"
    }', 300, -100),
    (wf2_s3_id, wf2_id, 'send_email', '{
      "to": "false-branch@example.com",
      "subject": "Condition was FALSE",
      "html_body": "<p>False branch</p>"
    }', 300, 100);

  INSERT INTO workflow_edges (id, workflow_id, source_step_id, target_step_id, condition_branch, sort_order) VALUES
    (gen_random_uuid(), wf2_id, wf2_s1_id, wf2_s2_id, 'true', 0),
    (gen_random_uuid(), wf2_id, wf2_s1_id, wf2_s3_id, 'false', 1);

  -- ============================================================
  -- WORKFLOW 3: Delay Step
  -- manual → delay (1 min) → send_email
  -- ============================================================

  INSERT INTO workflows (id, tenant_id, name, description, trigger_type, trigger_config, is_active)
  VALUES (
    wf3_id, v_tenant_id,
    'Test: Delay Step',
    'Delay step followed by email. Tests delay handling and resume-after-wait.',
    'manual', '{}', true
  );

  INSERT INTO workflow_steps (id, workflow_id, step_type, step_config, position_x, position_y) VALUES
    (wf3_s1_id, wf3_id, 'delay', '{
      "value": 1,
      "unit": "minutes"
    }', 0, 0),
    (wf3_s2_id, wf3_id, 'send_email', '{
      "to": "after-delay@example.com",
      "subject": "Delay completed",
      "html_body": "<p>This email was sent after 1 minute delay</p>"
    }', 300, 0);

  INSERT INTO workflow_edges (id, workflow_id, source_step_id, target_step_id, condition_branch, sort_order)
  VALUES (gen_random_uuid(), wf3_id, wf3_s1_id, wf3_s2_id, NULL, 0);

  -- ============================================================
  -- WORKFLOW 4: Webhook + Condition
  -- manual → webhook (httpbin) → condition (status 200) → send_email
  -- ============================================================

  INSERT INTO workflows (id, tenant_id, name, description, trigger_type, trigger_config, is_active)
  VALUES (
    wf4_id, v_tenant_id,
    'Test: Webhook + Condition',
    'Webhook call to httpbin.org then condition check on status code. Tests external HTTP + branching.',
    'manual', '{}', true
  );

  INSERT INTO workflow_steps (id, workflow_id, step_type, step_config, position_x, position_y) VALUES
    (wf4_s1_id, wf4_id, 'webhook', '{
      "url": "https://httpbin.org/post",
      "method": "POST",
      "headers": {},
      "body": "{\"test\": true}"
    }', 0, 0),
    (wf4_s2_id, wf4_id, 'condition', '{
      "type": "condition",
      "expression": "statusCode == 200"
    }', 300, 0),
    (wf4_s3_id, wf4_id, 'send_email', '{
      "to": "webhook-success@example.com",
      "subject": "Webhook returned 200",
      "html_body": "<p>Webhook test passed</p>"
    }', 600, 0);

  INSERT INTO workflow_edges (id, workflow_id, source_step_id, target_step_id, condition_branch, sort_order) VALUES
    (gen_random_uuid(), wf4_id, wf4_s1_id, wf4_s2_id, NULL, 0),
    (gen_random_uuid(), wf4_id, wf4_s2_id, wf4_s3_id, 'true', 1);

  -- ============================================================
  -- WORKFLOW 5: Full Pipeline
  -- survey_submitted → condition (responseId) → ai_action → condition (score)
  --   → (true) send_email / (false) delay
  -- ============================================================

  INSERT INTO workflows (id, tenant_id, name, description, trigger_type, trigger_config, is_active)
  VALUES (
    wf5_id, v_tenant_id,
    'Test: Full Pipeline',
    'End-to-end pipeline: survey trigger → validate → AI score → branch on score → email or delay. Tests all step types together.',
    'survey_submitted', '{}', true
  );

  INSERT INTO workflow_steps (id, workflow_id, step_type, step_config, position_x, position_y) VALUES
    (wf5_s1_id, wf5_id, 'condition', '{
      "type": "condition",
      "expression": "responseId != null"
    }', 0, 0),
    (wf5_s2_id, wf5_id, 'ai_action', '{
      "prompt": "Analyze response {{responseId}}",
      "output_schema": [
        {"key": "overallScore", "label": "Score", "type": "number"},
        {"key": "recommendation", "label": "Recommendation", "type": "string"}
      ]
    }', 300, 0),
    (wf5_s3_id, wf5_id, 'condition', '{
      "type": "condition",
      "expression": "overallScore >= 5"
    }', 600, 0),
    (wf5_s4_id, wf5_id, 'send_email', '{
      "to": "qualified@example.com",
      "subject": "Lead qualified (score: {{overallScore}})",
      "html_body": "<p>Recommendation: {{recommendation}}</p>"
    }', 900, -100),
    (wf5_s5_id, wf5_id, 'delay', '{
      "value": 5,
      "unit": "minutes"
    }', 900, 100);

  INSERT INTO workflow_edges (id, workflow_id, source_step_id, target_step_id, condition_branch, sort_order) VALUES
    (gen_random_uuid(), wf5_id, wf5_s1_id, wf5_s2_id, NULL, 0),
    (gen_random_uuid(), wf5_id, wf5_s2_id, wf5_s3_id, NULL, 1),
    (gen_random_uuid(), wf5_id, wf5_s3_id, wf5_s4_id, 'true', 2),
    (gen_random_uuid(), wf5_id, wf5_s3_id, wf5_s5_id, 'false', 3);

  RAISE NOTICE 'Test workflows seeded successfully:';
  RAISE NOTICE '  WF1 (Linear):          %', wf1_id;
  RAISE NOTICE '  WF2 (Condition Branch): %', wf2_id;
  RAISE NOTICE '  WF3 (Delay Step):       %', wf3_id;
  RAISE NOTICE '  WF4 (Webhook+Condition):%', wf4_id;
  RAISE NOTICE '  WF5 (Full Pipeline):    %', wf5_id;

END $$;
