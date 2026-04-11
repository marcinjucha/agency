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
  /** Current step execution ID — used by dry-run test mode to identify step */
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
  surveyLinkId?: string
  clientEmail?: string
  appointmentAt?: string
}

export type TriggerPayloadLeadScored = {
  trigger_type: 'lead_scored'
  responseId: string
  score: number
  recommendation: 'QUALIFIED' | 'DISQUALIFIED' | 'NEEDS_MORE_INFO'
  summary?: string
  analyzedAt?: string
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

// --- Execution Limits ---

export const DEFAULT_EXECUTION_LIMITS = {
  maxSteps: 50,
  stepTimeoutMs: 5 * 60 * 1000, // 5 minutes
} as const

export type ExecutionLimits = typeof DEFAULT_EXECUTION_LIMITS

// --- Type guard helpers ---

export function isTriggerType(value: string): value is TriggerType {
  return ['survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled'].includes(value)
}
