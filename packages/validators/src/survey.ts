import { z } from 'zod'

export const surveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['text', 'textarea', 'email', 'tel', 'select', 'radio', 'checkbox']),
      label: z.string().min(1),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })
  ),
})

export type Survey = z.infer<typeof surveySchema>
