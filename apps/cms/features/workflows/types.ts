import type { Tables } from '@agency/database'
import { messages } from '@/lib/messages'

// --- Enums ---

export type TriggerType = 'survey_submitted' | 'booking_created' | 'lead_scored' | 'manual' | 'scheduled'

export type StepType = 'send_email' | 'delay' | 'condition' | 'webhook' | 'ai_action'

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type StepExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

// --- Trigger Config (discriminated union) ---

export type TriggerConfigSurveySubmitted = {
  type: 'survey_submitted'
  survey_id?: string
}

export type TriggerConfigBookingCreated = {
  type: 'booking_created'
}

export type TriggerConfigLeadScored = {
  type: 'lead_scored'
  min_score?: number
}

export type TriggerConfigManual = {
  type: 'manual'
}

export type TriggerConfigScheduled = {
  type: 'scheduled'
}

export type TriggerConfig =
  | TriggerConfigSurveySubmitted
  | TriggerConfigBookingCreated
  | TriggerConfigLeadScored
  | TriggerConfigManual
  | TriggerConfigScheduled

// --- Step Config (discriminated union) ---

export type StepConfigSendEmail = {
  type: 'send_email'
  template_id?: string
  to_expression?: string
}

export type StepConfigDelay = {
  type: 'delay'
  duration_minutes: number
}

export type StepConfigCondition = {
  type: 'condition'
  expression: string
}

export type StepConfigWebhook = {
  type: 'webhook'
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string
}

export type StepConfigAiAction = {
  type: 'ai_action'
  prompt: string
  model?: string
}

export type StepConfig =
  | StepConfigSendEmail
  | StepConfigDelay
  | StepConfigCondition
  | StepConfigWebhook
  | StepConfigAiAction

// --- Domain types with typed JSONB fields ---

export type Workflow = Omit<Tables<'workflows'>, 'trigger_config'> & {
  trigger_config: TriggerConfig
}

export type WorkflowStep = Omit<Tables<'workflow_steps'>, 'step_config'> & {
  step_config: StepConfig
}

export type WorkflowEdge = Tables<'workflow_edges'>

export type WorkflowExecution = Omit<Tables<'workflow_executions'>, 'trigger_payload' | 'status'> & {
  trigger_payload: Record<string, unknown>
  status: ExecutionStatus
}

export type WorkflowStepExecution = Omit<
  Tables<'workflow_step_executions'>,
  'input_payload' | 'output_payload' | 'status'
> & {
  input_payload: Record<string, unknown> | null
  output_payload: Record<string, unknown> | null
  status: StepExecutionStatus
}

// --- Composite types ---

export type WorkflowWithSteps = Workflow & {
  steps: WorkflowStep[]
  edges: WorkflowEdge[]
}

// --- List view subset ---

export type WorkflowListItem = Pick<
  Tables<'workflows'>,
  'id' | 'name' | 'description' | 'trigger_type' | 'is_active' | 'created_at' | 'updated_at'
>

// --- Cast helpers (Supabase returns JSONB as generic Json) ---

export function toWorkflow(raw: unknown): Workflow {
  const row = raw as Tables<'workflows'>
  return {
    ...row,
    trigger_config: (row.trigger_config && typeof row.trigger_config === 'object'
      ? row.trigger_config
      : { type: row.trigger_type }) as unknown as TriggerConfig,
  }
}

export function toWorkflowListItem(raw: unknown): WorkflowListItem {
  const row = raw as Tables<'workflows'>
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trigger_type: row.trigger_type,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function toWorkflowStep(raw: unknown): WorkflowStep {
  const row = raw as Tables<'workflow_steps'>
  return {
    ...row,
    step_config: (row.step_config && typeof row.step_config === 'object'
      ? row.step_config
      : { type: row.step_type }) as unknown as StepConfig,
  }
}

export function toWorkflowEdge(raw: unknown): WorkflowEdge {
  return raw as WorkflowEdge
}

export function toWorkflowExecution(raw: unknown): WorkflowExecution {
  const row = raw as Tables<'workflow_executions'>
  return {
    ...row,
    trigger_payload: (row.trigger_payload && typeof row.trigger_payload === 'object'
      ? row.trigger_payload
      : {}) as Record<string, unknown>,
    status: row.status as ExecutionStatus,
  }
}

export function toWorkflowStepExecution(raw: unknown): WorkflowStepExecution {
  const row = raw as Tables<'workflow_step_executions'>
  return {
    ...row,
    input_payload: (row.input_payload && typeof row.input_payload === 'object'
      ? row.input_payload
      : null) as Record<string, unknown> | null,
    output_payload: (row.output_payload && typeof row.output_payload === 'object'
      ? row.output_payload
      : null) as Record<string, unknown> | null,
    status: row.status as StepExecutionStatus,
  }
}

// --- Label records (single source of truth for display labels) ---

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  survey_submitted: messages.workflows.triggerSurveySubmitted,
  booking_created: messages.workflows.triggerBookingCreated,
  lead_scored: messages.workflows.triggerLeadScored,
  manual: messages.workflows.triggerManual,
  scheduled: messages.workflows.triggerScheduled,
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  send_email: messages.workflows.stepSendEmail,
  delay: messages.workflows.stepDelay,
  condition: messages.workflows.stepCondition,
  webhook: messages.workflows.stepWebhook,
  ai_action: messages.workflows.stepAiAction,
}

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  pending: messages.workflows.executionPending,
  running: messages.workflows.executionRunning,
  completed: messages.workflows.executionCompleted,
  failed: messages.workflows.executionFailed,
  cancelled: messages.workflows.executionCancelled,
}

export const STEP_EXECUTION_STATUS_LABELS: Record<StepExecutionStatus, string> = {
  pending: messages.workflows.stepExecutionPending,
  running: messages.workflows.stepExecutionRunning,
  completed: messages.workflows.stepExecutionCompleted,
  failed: messages.workflows.stepExecutionFailed,
  skipped: messages.workflows.stepExecutionSkipped,
}

// --- Options for select dropdowns (derived from label records) ---

export const TRIGGER_TYPE_OPTIONS = Object.entries(TRIGGER_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as TriggerType, label })
)

export const STEP_TYPE_OPTIONS = Object.entries(STEP_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as StepType, label })
)

// --- Config panel types ---

/** Lightweight email template for config panel dropdown (avoids full blocks/html_body) */
export type EmailTemplateOption = {
  id: string
  type: string
  subject: string
}

/** Lightweight survey for config panel dropdown */
export type SurveyOption = {
  id: string
  title: string
}

/** All node types that have config panels (triggers + steps) */
export type ConfigPanelNodeType = TriggerType | StepType

/**
 * HTTP methods available for webhook config.
 * Derived from StepConfigWebhook['method'] but as a standalone constant for selects.
 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

/** Delay preset options (minutes) for quick selection in delay config */
export const DELAY_PRESETS = [5, 15, 60, 1440, 4320] as const
