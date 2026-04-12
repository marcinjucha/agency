import type { TriggerType } from '../types'

// --- Execution Context ---

/** Immutable context passed to every step handler during execution */
export type ExecutionContext = {
  executionId: string
  workflowId: string
  tenantId: string
  triggerPayload: TriggerPayload
  /** Current step execution ID */
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

// --- Variable Context ---

/** Flat key-value map used for {{variable}} resolution in templates */
export type VariableContext = Record<string, unknown>

// --- Type guard helpers ---

export function isTriggerType(value: string): value is TriggerType {
  return ['survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled'].includes(value)
}
