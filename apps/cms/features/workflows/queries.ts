import { createClient } from '@/lib/supabase/client'
import type {
  WorkflowListItem,
  WorkflowWithSteps,
  WorkflowExecution,
  EmailTemplateOption,
  SurveyOption,
  ExecutionWithWorkflow,
  ExecutionWithSteps,
  StepExecutionWithMeta,
  ExecutionStatus,
} from './types'
import {
  toWorkflow,
  toWorkflowListItem,
  toWorkflowStep,
  toWorkflowEdge,
  toWorkflowExecution,
  toExecutionWithWorkflow,
  toStepExecutionWithMeta,
} from './types'

// Filters interface for getAllExecutions
export interface ExecutionFilters {
  workflowId?: string
  status?: ExecutionStatus
}

const LIST_FIELDS = 'id, name, description, trigger_type, is_active, created_at, updated_at' as const

export async function getWorkflows(): Promise<WorkflowListItem[]> {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflows type resolves to never (Supabase JS v2.95.2 incompatibility)
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select(LIST_FIELDS)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toWorkflowListItem)
}

export async function getWorkflow(id: string): Promise<WorkflowWithSteps> {
  const supabase = createClient()

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

export async function getWorkflowExecutions(
  workflowId: string,
  options?: { limit?: number; offset?: number; excludeDryRuns?: boolean }
): Promise<WorkflowExecution[]> {
  const supabase = createClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  let query = (supabase as any)
    .from('workflow_executions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.excludeDryRuns !== false) {
    query = query.eq('is_dry_run', false)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(toWorkflowExecution)
}

/**
 * Lightweight email template list for SendEmail config panel dropdown.
 * Returns only id, type, subject — avoids loading full blocks/html_body.
 */
export async function getEmailTemplatesForWorkflow(): Promise<EmailTemplateOption[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('id, type, subject')
    .order('type')

  if (error) throw error
  return (data || []) as EmailTemplateOption[]
}

/**
 * Lightweight survey list for TriggerConfigPanel dropdown.
 * Returns only id, title — avoids loading full survey data.
 */
export async function getSurveysForWorkflow(): Promise<SurveyOption[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('surveys')
    .select('id, title')
    .order('title')

  if (error) throw error
  return (data || []) as SurveyOption[]
}

/**
 * Global execution list — all workflows, optional filters, with workflow name via FK join.
 */
export async function getAllExecutions(
  filters?: ExecutionFilters,
  options?: { limit?: number; offset?: number }
): Promise<ExecutionWithWorkflow[]> {
  const supabase = createClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  let query = (supabase as any)
    .from('workflow_executions')
    .select('*, workflows(name, trigger_type)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filter out dry-runs by default
  query = query.eq('is_dry_run', false)

  if (filters?.workflowId) {
    query = query.eq('workflow_id', filters.workflowId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(toExecutionWithWorkflow)
}

/**
 * Single execution with step-level breakdown.
 * Joins: workflow_executions → workflows (name), workflow_step_executions → workflow_steps (step_type).
 * Orders step_executions by created_at ASC.
 */
export async function getExecutionWithSteps(executionId: string): Promise<ExecutionWithSteps | null> {
  const supabase = createClient()

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

  // Fetch step executions with workflow step metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase JS v2.95.2 incompatibility
  const { data: stepsData, error: stepsError } = await (supabase as any)
    .from('workflow_step_executions')
    .select('*, workflow_steps(step_type)')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true })

  if (stepsError) throw stepsError

  const step_executions: StepExecutionWithMeta[] = (stepsData || []).map(toStepExecutionWithMeta)

  return {
    ...execution,
    step_executions,
  }
}
