import { z } from 'zod'
import type { QuestionType } from './common'

/**
 * Survey validation schema
 *
 * IMPORTANT: Question type values ('text', 'textarea', etc.) MUST match
 * the QuestionType from @legal-mind/validators/common
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
] as const satisfies readonly QuestionType[]

export const surveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(QUESTION_TYPES),
      label: z.string().min(1),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })
  ),
})

export type Survey = z.infer<typeof surveySchema>
