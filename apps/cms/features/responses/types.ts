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
 * are imported from @legal-mind/validators/common to ensure consistency across
 * survey creation, submission, and response management.
 *
 * @module apps/cms/features/responses/types
 */

import type { Tables } from '@legal-mind/database'
import type {
  Question,
  QuestionType,
  ResponseStatus,
  SurveyAnswers,
} from '@legal-mind/validators'

// Re-export shared types so consumers only import from this file
export type { Question, QuestionType, ResponseStatus, SurveyAnswers }

/**
 * Survey metadata needed in response detail view
 * Subset of survey data joined with response for displaying context
 *
 * @example
 * const survey: SurveyMetadata = {
 *   id: "s-123",
 *   title: "Client Intake Form",
 *   questions: [...]
 * }
 */
export interface SurveyMetadata {
  /** Survey UUID from database */
  id: string
  /** Survey title */
  title: string
  /** Array of questions (JSONB field typed as Question[]) */
  questions: Question[]
}

/**
 * Survey link metadata needed in response detail view
 * Subset of survey_links data joined with response
 *
 * @example
 * const link: SurveyLinkMetadata = {
 *   token: "abc123",
 *   survey_id: "s-123"
 * }
 */
export interface SurveyLinkMetadata {
  /** Unique access token for the survey link */
  token: string
  /** Foreign key to surveys table */
  survey_id: string
}


/**
 * AI qualification metadata
 * Placeholder for Phase 5 AI analysis results
 * Currently stored as JSONB null, will contain AI scores and analysis
 *
 * @example
 * const qualification: AIQualification = {
 *   score: 0.85,
 *   reasoning: "Client meets initial criteria",
 *   timestamp: "2025-12-12T10:30:00Z"
 * }
 */
export interface AIQualification {
  [key: string]: any
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
   * Type matches SurveyAnswers from @legal-mind/validators
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
  survey_links?: SurveyLinkMetadata
  /** Joined surveys data for question context */
  surveys?: SurveyMetadata
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

/**
 * Response status change event
 * Used for tracking status update history (future enhancement)
 *
 * @example
 * const event: ResponseStatusChange = {
 *   responseId: "r-123",
 *   from: "new",
 *   to: "qualified",
 *   changedAt: "2025-12-12T11:00:00Z",
 *   changedBy: "user-123"
 * }
 */
export interface ResponseStatusChange {
  /** Response UUID */
  responseId: string
  /** Previous status */
  from: ResponseStatus | null
  /** New status */
  to: ResponseStatus
  /** Change timestamp */
  changedAt: string
  /** User UUID who made the change */
  changedBy?: string
}

/**
 * Response filter criteria
 * Used for filtering responses in list view
 *
 * @example
 * const filters: ResponseFilters = {
 *   surveyId: "s-123",
 *   status: "new",
 *   dateFrom: "2025-12-01",
 *   dateTo: "2025-12-12"
 * }
 */
export interface ResponseFilters {
  /** Filter by survey ID */
  surveyId?: string
  /** Filter by response status */
  status?: ResponseStatus
  /** Filter responses from date (ISO 8601) */
  dateFrom?: string
  /** Filter responses to date (ISO 8601) */
  dateTo?: string
  /** Search in answers (future enhancement) */
  searchQuery?: string
}

/**
 * Response pagination metadata
 * Used for paginated response lists
 *
 * @example
 * const pagination: ResponsePagination = {
 *   total: 150,
 *   page: 1,
 *   pageSize: 25,
 *   totalPages: 6
 * }
 */
export interface ResponsePagination {
  /** Total number of responses matching filters */
  total: number
  /** Current page (1-indexed) */
  page: number
  /** Number of items per page */
  pageSize: number
  /** Total number of pages */
  totalPages: number
}

/**
 * Response list response data
 * Combines list items with pagination metadata
 *
 * @example
 * const data: ResponseListData = {
 *   items: [...],
 *   pagination: { total: 150, page: 1, pageSize: 25, totalPages: 6 }
 * }
 */
export interface ResponseListData {
  /** Array of response list items */
  items: ResponseListItem[]
  /** Pagination metadata */
  pagination: ResponsePagination
}
