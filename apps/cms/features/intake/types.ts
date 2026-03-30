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
import { messages } from '@/lib/messages'

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

/** Client contact info extracted from survey answers via semantic_role */
export interface ClientInfo {
  name: string
  email: string | null
  companyName: string | null
  phone: string | null
}

/** Response as displayed in Pipeline card */
export interface PipelineResponse {
  id: string
  status: ResponseStatus
  /** Client name extracted via semantic_role, or positional fallback */
  clientName: string
  /** Client email extracted via semantic_role */
  clientEmail: string | null
  /** Company name extracted via semantic_role */
  companyName: string | null
  /** Phone extracted via semantic_role */
  phone: string | null
  /** AI overall score (0-10), null if not analyzed */
  aiScore: number | null
  /** AI recommendation */
  aiRecommendation: AIQualification['recommendation'] | null
  /** When the response was submitted */
  createdAt: string
  /** Whether this response has a linked appointment */
  hasAppointment: boolean
  /** Appointment details (if linked) */
  appointment: {
    startTime: string
    endTime: string
    status: string
  } | null
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

/** Shared status labels — single source of truth */
export const STATUS_LABELS: Record<ResponseStatus, string> = {
  new: messages.intake.columnNew,
  qualified: messages.intake.columnQualified,
  contacted: messages.intake.columnContacted,
  disqualified: messages.intake.badgeDisqualified,
  client: messages.intake.badgeClient,
  rejected: messages.intake.badgeRejected,
}

/** AI score threshold: 8-10 hot, 5-7 warm, 0-4 cold */
export function getAiScoreThreshold(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 8) return 'hot'
  if (score >= 5) return 'warm'
  return 'cold'
}

/** AI score → background color (for pipeline card circles) */
export function getAiScoreBgColor(score: number): string {
  const t = getAiScoreThreshold(score)
  return t === 'hot' ? 'bg-emerald-500' : t === 'warm' ? 'bg-amber-500' : 'bg-red-500'
}

/** AI score → text color (for table/panel display) */
export function getAiScoreTextColor(score: number): string {
  const t = getAiScoreThreshold(score)
  return t === 'hot' ? 'text-emerald-400' : t === 'warm' ? 'text-amber-400' : 'text-red-400'
}

/** Appointment status labels */
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: messages.intake.appointmentScheduled ?? 'Zaplanowana',
  completed: messages.intake.appointmentCompleted ?? 'Zakończona',
  cancelled: messages.intake.appointmentCancelled ?? 'Anulowana',
  no_show: messages.intake.appointmentNoShow ?? 'Nieobecność',
}
