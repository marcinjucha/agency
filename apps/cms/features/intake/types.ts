/**
 * Intake Hub Type Definitions
 *
 * Pipeline-specific types that COMPOSE from existing response and appointment types.
 * This feature does NOT modify features/responses/ or features/appointments/.
 *
 * @module apps/cms/features/intake/types
 */

import type { ResponseStatus, AIQualification, SurveyAnswers } from '../responses/types'
import type { AppointmentListItem } from '../appointments/types'

// Re-export for convenience
export type { ResponseStatus, AIQualification, AppointmentListItem }

/** Kanban column identifiers */
export type PipelineColumnId = 'new' | 'qualified' | 'contacted' | 'closed'

/** Mapping of response statuses to pipeline columns */
export const STATUS_TO_COLUMN: Record<ResponseStatus, PipelineColumnId> = {
  new: 'new',
  qualified: 'qualified',
  contacted: 'contacted',
  disqualified: 'closed',
  client: 'closed',
  rejected: 'closed',
}

/** Sub-statuses that appear as badges in the "Zamkniety" column */
export const CLOSED_SUB_STATUSES = ['client', 'rejected', 'disqualified'] as const
export type ClosedSubStatus = (typeof CLOSED_SUB_STATUSES)[number]

/** Pipeline column config */
export interface PipelineColumnConfig {
  id: PipelineColumnId
  label: string
  /** DB statuses that map to this column */
  statuses: ResponseStatus[]
}

/** Response as displayed in Pipeline card */
export interface PipelineResponse {
  id: string
  status: ResponseStatus
  /** Client name extracted from first answer, or fallback */
  clientName: string
  /** AI overall score (0-10), null if not analyzed */
  aiScore: number | null
  /** AI recommendation */
  aiRecommendation: AIQualification['recommendation'] | null
  /** When the response was submitted */
  createdAt: string
  /** Whether this response has a linked appointment */
  hasAppointment: boolean
  /** Internal notes (for Sheet, not shown on card) */
  internalNotes: string | null
  /** When status was last changed */
  statusChangedAt: string | null
  /** Raw answers for Sheet detail view */
  answers: SurveyAnswers
  /** Survey title */
  surveyTitle: string
  /** Survey questions JSON (for Q&A display in Sheet) */
  surveyQuestions: unknown[]
  /** Response's survey link ID */
  surveyLinkId: string
}

/** Sort options for Pipeline */
export type PipelineSortOption = 'newest' | 'ai_score' | 'name'

/** Stats displayed at the top of Intake Hub */
export interface IntakeStats {
  newResponses: number
  waitingForContact: number
  appointmentsToday: number
  appointmentsTomorrow: number
}
