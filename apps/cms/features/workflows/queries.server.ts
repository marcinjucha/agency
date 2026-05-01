import { createServerClient } from '@/lib/supabase/server-start'
import type { WorkflowListItem, WorkflowWithSteps, ExecutionWithSteps, StepExecutionWithMeta } from './types'
import { toWorkflow, toWorkflowListItem, toWorkflowStep, toWorkflowEdge, toExecutionWithWorkflow, toStepExecutionWithMeta, parseWorkflowSnapshot } from './types'

const LIST_FIELDS = 'id, name, description, trigger_type, is_active, created_at, updated_at' as const

export async function getWorkflowsServer(): Promise<WorkflowListItem[]> {
  const supabase = createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflows type resolves to never (Supabase JS v2.95.2 incompatibility)
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select(LIST_FIELDS)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toWorkflowListItem)
}

export async function getWorkflowServer(id: string): Promise<WorkflowWithSteps> {
  const supabase = createServerClient()

  // Fetch workflow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  const { data: workflowData, error: workflowError } = await (supabase as any)
    .from('workflows')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (workflowError) throw workflowError
  if (!workflowData) throw new Error('Workflow not found')

  // Fetch steps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stepsData, error: stepsError } = await (supabase as any)
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', id)
    .order('created_at', { ascending: true })

  if (stepsError) throw stepsError

  // Fetch edges
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: edgesData, error: edgesError } = await (supabase as any)
    .from('workflow_edges')
    .select('*')
    .eq('workflow_id', id)
    .order('sort_order', { ascending: true })

  if (edgesError) throw edgesError

  const workflow = toWorkflow(workflowData)
  return {
    ...workflow,
    steps: (stepsData || []).map(toWorkflowStep),
    edges: (edgesData || []).map(toWorkflowEdge),
  }
}

/**
 * Single execution with step-level breakdown — server client variant for SSR route pages.
 * Joins: workflow_executions → workflows (name), workflow_step_executions → workflow_steps (step_type).
 */
export async function getExecutionWithStepsServer(executionId: string): Promise<ExecutionWithSteps | null> {
  const supabase = createServerClient()

  // Fetch execution with workflow name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  const { data: execData, error: execError } = await (supabase as any)
    .from('workflow_executions')
    .select('*, workflows(name, trigger_type)')
    .eq('id', executionId)
    .maybeSingle()

  if (execError) throw execError
  if (!execData) return null

  const execution = toExecutionWithWorkflow(execData)

  const workflow_snapshot = parseWorkflowSnapshot(execData.workflow_snapshot)

  // Fetch step executions with workflow step metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  const { data: stepsData, error: stepsError } = await (supabase as any)
    .from('workflow_step_executions')
    .select('*, workflow_steps(step_type)')
    .eq('execution_id', executionId)
    .order('attempt_number', { ascending: true })
    .order('created_at', { ascending: true })

  if (stepsError) throw stepsError

  const step_executions: StepExecutionWithMeta[] = (stepsData || []).map(toStepExecutionWithMeta)

  return {
    ...execution,
    step_executions,
    workflow_snapshot,
  }
}
