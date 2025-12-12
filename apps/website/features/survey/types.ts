/**
 * Survey Feature Type Definitions
 *
 * Foundation types for the client-facing survey feature.
 * All queries, validation schemas, and components import from this file.
 *
 * NOTE: Core question types (QuestionType, Question, SurveyAnswers) are imported
 * from @legal-mind/validators/common to ensure consistency across all features.
 *
 * @module apps/website/features/survey/types
 */

import type {
  Question,
  QuestionType,
  SurveyAnswers,
} from '@legal-mind/validators'

// Re-export shared types for convenience
export type { Question, QuestionType, SurveyAnswers }

/**
 * Survey metadata and questions
 * Core survey data structure
 */
export interface SurveyData {
  /** Survey UUID from database */
  id: string
  /** Survey title */
  title: string
  /** Optional survey description */
  description: string | null
  /** Array of questions (JSONB field typed as Question[]) */
  questions: Question[]
}

/**
 * Survey link with related survey data
 * Returned from queries that join survey_links and surveys tables
 */
export interface SurveyLinkData {
  /** Survey link UUID from database */
  id: string
  /** Unique access token for the survey link */
  token: string
  /** Foreign key to surveys table */
  survey_id: string
  /** Optional client email for tracking */
  client_email: string | null
  /** Optional expiration timestamp (ISO 8601) */
  expires_at: string | null
  /** Maximum allowed submissions (null = unlimited) */
  max_submissions: number | null
  /** Current submission count */
  submission_count: number | null
  /** Whether the link is active */
  is_active: boolean
  /** Joined survey data */
  survey: SurveyData
}

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
