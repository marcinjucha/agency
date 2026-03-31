import { createClient } from '@/lib/supabase/server'
import type { WorkflowListItem, WorkflowWithSteps } from './types'
import { toWorkflow, toWorkflowListItem, toWorkflowStep, toWorkflowEdge } from './types'

const LIST_FIELDS = 'id, name, description, trigger_type, is_active, created_at, updated_at' as const

export async function getWorkflowsServer(): Promise<WorkflowListItem[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflows type resolves to never (Supabase JS v2.95.2 incompatibility)
  const { data, error } = await (supabase as any)
    .from('workflows')
    .select(LIST_FIELDS)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toWorkflowListItem)
}

export async function getWorkflowServer(id: string): Promise<WorkflowWithSteps> {
  const supabase = await createClient()

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
