/**
 * Survey Feature Type Definitions
 *
 * Foundation types for the client-facing survey feature.
 * All queries, validation schemas, and components import from this file.
 *
 * NOTE: Core question types (QuestionType, Question, SurveyAnswers) are imported
 * from @agency/validators/common to ensure consistency across all features.
 *
 * @module apps/website/features/survey/types
 */

import type {
  Question,
  QuestionType,
  SurveyAnswers,
  SurveyData,
  SurveyLinkData,
} from '@agency/validators'

// Re-export shared types for convenience
export type { Question, QuestionType, SurveyAnswers, SurveyData, SurveyLinkData }

/**
 * Survey link validation result
 * Returned from getSurveyByToken query with business logic validation
 */
export interface LinkValidation {
  /** Whether the link is valid and survey can be accessed */
  isValid: boolean
  /** Error reason if validation failed */
  error?: 'expired' | 'max_submissions' | 'inactive' | 'not_found'
  /** Human-readable error message */
  message?: string
  /** Survey link data (only present when isValid is true) */
  data?: SurveyLinkData
}


/**
 * Calendar time slot returned from /api/calendar/slots
 */
export interface CalendarSlot {
  start: string // ISO 8601 datetime
  end: string // ISO 8601 datetime
}

/**
 * Survey submission result
 * Returned from submitSurvey mutation
 */
export interface SubmissionResult {
  /** Whether the submission was successful */
  success: boolean
  /** Error message if submission failed */
  error?: string
  /** Created survey response UUID if successful */
  responseId?: string
}
