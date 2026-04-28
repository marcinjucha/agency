-- Migrate all condition steps to switch format
-- condition had: { type: 'condition', expression: '...' }
-- switch needs:  { type: 'switch', branches: [{id:'tak', label:'Tak', expression: '...'}, {id:'default', label:'Pozostałe', expression:'default'}] }

UPDATE workflow_steps
SET step_config = jsonb_build_object(
  'type', 'switch',
  'branches', jsonb_build_array(
    jsonb_build_object(
      'id', 'tak',
      'label', 'Tak',
      'expression', step_config->>'expression'
    ),
    jsonb_build_object(
      'id', 'default',
      'label', 'Pozostałe',
      'expression', 'default'
    )
  )
)
WHERE step_type = 'condition';

-- Update step_type column
UPDATE workflow_steps
SET step_type = 'switch'
WHERE step_type = 'condition';

-- Update edges: condition_branch 'true' → 'tak', 'false' → 'default'
UPDATE workflow_edges
SET condition_branch = 'tak'
WHERE condition_branch = 'true'
  AND source_step_id IN (
    SELECT id FROM workflow_steps WHERE step_type = 'switch'
  );

UPDATE workflow_edges
SET condition_branch = 'default'
WHERE condition_branch = 'false'
  AND source_step_id IN (
    SELECT id FROM workflow_steps WHERE step_type = 'switch'
  );
