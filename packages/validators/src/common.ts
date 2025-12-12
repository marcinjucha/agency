/**
 * Common Type Definitions
 *
 * Shared types used across multiple features in the application.
 * This file is the single source of truth for types that are used in:
 * - Survey creation (CMS)
 * - Survey submission (Website)
 * - Response management (CMS)
 *
 * @module @legal-mind/validators/common
 */

/**
 * Supported question types in surveys
 * Any changes here automatically apply to all features
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
 *
 * Used in:
 * - Survey builder (CMS) - creating/editing questions
 * - Survey form (Website) - rendering questions
 * - Response display (CMS) - matching answers to questions
 */
export interface Question {
  /** Unique identifier for the question (UUID) */
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
 * Survey form answers
 * Dynamic key-value map where:
 * - Keys are question IDs (string UUIDs)
 * - Values are either:
 *   - string: for text, textarea, email, tel, select, radio
 *   - string[]: for checkbox (multiple selections)
 *
 * Used in:
 * - Form submission (Website) - storing user answers
 * - Response display (CMS) - showing submitted answers
 */
export type SurveyAnswers = Record<string, string | string[]>

/**
 * Response status enum
 * Tracks where a client response is in the qualification workflow
 */
export type ResponseStatus = 'new' | 'qualified' | 'disqualified' | 'contacted'
