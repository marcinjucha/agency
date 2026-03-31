import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'
import type { TriggerType, WorkflowStep } from '../types'

// --- Execution Context ---

/** Immutable context passed to every step handler during execution */
export type ExecutionContext = {
  executionId: string
  workflowId: string
  tenantId: string
  triggerPayload: TriggerPayload
  /** Current step execution ID — used by async handlers to identify the step for callbacks */
  stepExecutionId: string
  /** Set when this execution was triggered by another workflow (circular protection) */
  triggeringExecutionId?: string
}

// --- Trigger Payloads (discriminated union by trigger_type) ---

export type TriggerPayloadSurveySubmitted = {
  trigger_type: 'survey_submitted'
  responseId: string
  surveyLinkId: string
}

export type TriggerPayloadBookingCreated = {
  trigger_type: 'booking_created'
  appointmentId: string
  responseId?: string
}

export type TriggerPayloadLeadScored = {
  trigger_type: 'lead_scored'
  responseId: string
  score: number
  recommendation: 'QUALIFIED' | 'DISQUALIFIED' | 'NEEDS_MORE_INFO'
}

export type TriggerPayloadManual = {
  trigger_type: 'manual'
}

export type TriggerPayloadScheduled = {
  trigger_type: 'scheduled'
}

export type TriggerPayload =
  | TriggerPayloadSurveySubmitted
  | TriggerPayloadBookingCreated
  | TriggerPayloadLeadScored
  | TriggerPayloadManual
  | TriggerPayloadScheduled

// --- Step Execution Result ---

/** Returned by every step handler after execution */
export type ActionResult = {
  success: boolean
  outputPayload?: Record<string, unknown>
  error?: string
  /**
   * When true, the step was dispatched to an external system (n8n) and will
   * be completed later via callback. The executor must NOT mark the step as
   * completed — it stays in 'running' status until the callback arrives.
   */
  async?: boolean
}

// --- Step Handler Signature ---

/** Function that executes a single workflow step */
export type StepHandler = (
  step: WorkflowStep,
  context: ExecutionContext,
  serviceClient: SupabaseClient<Database>,
  variableContext: VariableContext
) => Promise<ActionResult>

// --- Step Handler Registry ---

/** Maps step types to their handler implementations */
export type StepHandlerRegistry = Record<string, StepHandler>

// --- Variable Context ---

/** Flat key-value map used for {{variable}} resolution in templates */
export type VariableContext = Record<string, unknown>

// --- Type guard helpers ---

export function isTriggerType(value: string): value is TriggerType {
  return ['survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled'].includes(value)
}
