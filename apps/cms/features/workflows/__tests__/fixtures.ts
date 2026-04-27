import type { WorkflowStep, WorkflowEdge } from '../types'
import type { ExecutionContext, TriggerPayload } from '../engine/types'

/**
 * Factory for workflow steps with sensible defaults.
 * Accepts id, optional step_type and config overrides.
 */
export function makeStep(
  id: string,
  type = 'condition',
  config?: Record<string, unknown>
): WorkflowStep {
  return {
    id,
    slug: id,
    workflow_id: 'wf-1',
    step_type: type,
    step_config: { type, ...config },
    position_x: 0,
    position_y: 0,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  } as WorkflowStep
}

/**
 * Factory for workflow edges with optional condition branch.
 */
export function makeEdge(
  source: string,
  target: string,
  branch?: string | null
): WorkflowEdge {
  return {
    id: `edge-${source}-${target}`,
    workflow_id: 'wf-1',
    source_step_id: source,
    target_step_id: target,
    condition_branch: branch ?? null,
    sort_order: 0,
    created_at: '2026-01-01',
  } as WorkflowEdge
}

/**
 * Factory for a complete workflow object with sensible defaults.
 */
export function makeWorkflow(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'wf-1',
    tenant_id: 'tenant-1',
    name: 'Test Workflow',
    trigger_type: 'survey_submitted',
    trigger_config: {},
    is_active: true,
    ...overrides,
  }
}

/**
 * Factory for ExecutionContext used by action handlers and executor.
 */
export function makeContext(
  overrides?: Partial<ExecutionContext>
): ExecutionContext {
  return {
    executionId: 'exec-1',
    workflowId: 'wf-1',
    tenantId: 'tenant-1',
    stepExecutionId: 'step-exec-1',
    triggerPayload: { trigger_type: 'manual' },
    ...overrides,
  }
}

/** Default manual trigger payload for tests */
export const manualTrigger: TriggerPayload = { trigger_type: 'manual' }
