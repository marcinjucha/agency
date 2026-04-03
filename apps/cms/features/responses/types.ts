/**
 * Response Management Type Definitions
 *
 * Foundation types for the CMS response management feature.
 * All queries, validation schemas, and components import from this file.
 *
 * Includes types for:
 * - Individual responses with full data
 * - Response list items for table display
 * - AI qualification metadata
 * - Response status tracking
 *
 * NOTE: Shared question types (QuestionType, Question, SurveyAnswers, ResponseStatus)
 * are imported from @agency/validators/common to ensure consistency across
 * survey creation, submission, and response management.
 *
 * @module apps/cms/features/responses/types
 */

import type {
  Question,
  QuestionType,
  ResponseStatus,
  SurveyAnswers,
  SurveyData,
  SurveyLinkData,
} from '@agency/validators'

// Re-export shared types so consumers only import from this file
export type { Question, QuestionType, ResponseStatus, SurveyAnswers, SurveyData, SurveyLinkData }

/**
 * Minimal survey link data for response context
 * Subset of SurveyLinkData with only the fields we need for responses
 * Used internally in response queries to maintain type safety
 */
export interface ResponseSurveyLinkContext {
  /** Survey link UUID from database */
  id: string
  /** Unique access token for the survey link */
  token: string
  /** Foreign key to surveys table */
  survey_id: string
}


export interface AIQualification {
  model: string
  summary: string
  version: string
  analyzed_at: string
  value_score: number
  overall_score: number
  urgency_score: number
  recommendation: 'QUALIFIED' | 'DISQUALIFIED' | 'NEEDS_MORE_INFO'
  complexity_score: number
  notes_for_lawyer: string[]
  success_probability: number
}

/**
 * Survey response with full relational data
 * Used in detail view to display all response information with context
 * Includes all response fields + joined survey and survey link data
 *
 * @example
 * const response: ResponseWithRelations = {
 *   id: "r-123",
 *   survey_link_id: "l-456",
 *   tenant_id: "t-789",
 *   answers: {
 *     "q-1": "john@example.com",
 *     "q-2": "Some answer"
 *   },
 *   status: "new",
 *   created_at: "2025-12-12T10:30:00Z",
 *   updated_at: "2025-12-12T10:30:00Z",
 *   survey_links: { token: "abc123", survey_id: "s-123" },
 *   surveys: { id: "s-123", title: "Client Intake", questions: [...] }
 * }
 */
export interface ResponseWithRelations {
  /** Response UUID from database */
  id: string
  /** Foreign key to survey_links table */
  survey_link_id: string
  /** Tenant UUID from database (for RLS filtering) */
  tenant_id: string
  /** Dynamic answer key-value map
   * Keys are question IDs (string UUIDs)
   * Values are:
   * - string: for text, textarea, email, tel, select, radio
   * - string[]: for checkbox (multiple selections)
   * Type matches SurveyAnswers from @agency/validators
   */
  answers: SurveyAnswers
  /** AI qualification metadata (null until Phase 5 analysis runs) */
  ai_qualification: AIQualification | null
  /** Response status for filtering and tracking */
  status: ResponseStatus | null
  /** Response creation timestamp (ISO 8601) */
  created_at: string | null
  /** Response last update timestamp (ISO 8601) */
  updated_at: string | null
  /** Joined survey_links data for token access */
  survey_links?: ResponseSurveyLinkContext
  /** Joined surveys data for question context */
  surveys?: SurveyData
  /** Whether this response has a linked appointment */
  has_appointment?: boolean
}

/**
 * Response list item for table display
 * Minimal subset of ResponseWithRelations for efficient list rendering
 * Includes only fields needed for:
 * - Status badge display
 * - Survey title column
 * - Client email (if available)
 * - Created date column
 * - Detail view link
 *
 * @example
 * const item: ResponseListItem = {
 *   id: "r-123",
 *   status: "new",
 *   created_at: "2025-12-12T10:30:00Z",
 *   survey_links: { survey_id: "s-123" },
 *   surveys: { title: "Client Intake Form" }
 * }
 */
export interface ResponseListItem {
  /** Response UUID from database */
  id: string
  /** Response status for badge styling */
  status: ResponseStatus | null
  /** Response creation timestamp for sorting/display */
  created_at: string | null
  /** Joined survey_links data for survey context */
  survey_links: {
    /** Foreign key to surveys table (for lookup) */
    survey_id: string
  }
  /** Joined surveys data for display */
  surveys: {
    /** Survey title for list column */
    title: string
  }
  /** Whether this response has a linked appointment */
  has_appointment?: boolean
}


/**
 * Question-answer pair for display
 * Combines question metadata with the answer value for detail view rendering
 *
 * @example
 * const pair: QuestionAnswerPair = {
 *   question: {
 *     id: "q-1",
 *     type: "email",
 *     question: "Email address?",
 *     required: true,
 *     order: 1
 *   },
 *   answer: "john@example.com"
 * }
 */
export interface QuestionAnswerPair {
  /** Question metadata */
  question: Question
  /** Answer value(s) from response.answers */
  answer: string | string[] | undefined
}

