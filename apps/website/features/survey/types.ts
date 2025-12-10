/**
 * Survey Feature Type Definitions
 *
 * Foundation types for the client-facing survey feature.
 * All queries, validation schemas, and components import from this file.
 *
 * @module apps/website/features/survey/types
 */

/**
 * Supported question types in surveys
 */
export type QuestionType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'select'
  | 'radio'
  | 'checkbox'

/**
 * Individual survey question structure
 * Stored as JSONB in database, typed here for TypeScript safety
 */
export interface Question {
  /** Unique identifier for the question */
  id: string
  /** Question type determining input field rendering */
  type: QuestionType
  /** Question text displayed to user */
  question: string
  /** Whether the question must be answered */
  required: boolean
  /** Available options for select/radio/checkbox types */
  options?: string[]
  /** Display order in the survey */
  order: number
}

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
 * Survey form answers
 * Dynamic key-value map where:
 * - Keys are question IDs (string UUIDs)
 * - Values are either:
 *   - string: for text, textarea, email, tel, select, radio
 *   - string[]: for checkbox (multiple selections)
 */
export type SurveyAnswers = Record<string, string | string[]>

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
