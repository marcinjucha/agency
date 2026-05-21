import type { TriggerType } from '../types'
import type { BookingCreatedPayload, SurveySubmittedPayload } from '@agency/validators'
import { TRIGGER_TYPE_SET } from '../trigger-registry'

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

/**
 * WHY: Payload shapes imported from @agency/validators — the single source of truth shared
 * by both apps. This prevents drift between what booking.ts dispatches and what the engine
 * expects. @agency/validators is the canonical cross-app contract package (ADR-005).
 */
export type TriggerPayloadSurveySubmitted = SurveySubmittedPayload & {
  trigger_type: 'survey_submitted'
}

export type TriggerPayloadBookingCreated = BookingCreatedPayload & {
  trigger_type: 'booking_created'
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
  return (TRIGGER_TYPE_SET as ReadonlySet<string>).has(value)
}
