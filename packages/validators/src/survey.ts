import { z } from 'zod'
import type { QuestionType } from './common'

/**
 * Survey validation schema
 *
 * IMPORTANT: Question type values ('text', 'textarea', etc.) MUST match
 * the QuestionType from @agency/validators/common
 * If adding new question types, update QuestionType in common.ts FIRST,
 * then update this enum accordingly.
 */
const QUESTION_TYPES = [
  'text',
  'textarea',
  'email',
  'tel',
  'select',
  'radio',
  'checkbox',
  'date',
  'consent',
] as const satisfies readonly QuestionType[]

const SEMANTIC_ROLES = ['client_name', 'client_email', 'company_name', 'phone'] as const

export const questionSchema = z.object({
  id: z.string(),
  type: z.enum(QUESTION_TYPES),
  question: z.string().min(1),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  order: z.number(),
  semantic_role: z.enum(SEMANTIC_ROLES).nullable().optional(),
  placeholder: z.string().optional(),
  consent_url: z.string().refine(
    v => !v || v.startsWith('/') || v.startsWith('http'),
    { message: 'Link musi być ścieżką względną (/...) lub pełnym URL (https://...)' }
  ).optional(),
})

export const surveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  questions: z.array(questionSchema),
})

export type Survey = z.infer<typeof surveySchema>
