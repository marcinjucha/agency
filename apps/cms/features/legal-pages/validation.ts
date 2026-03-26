import { z } from 'zod'
import { messages } from '@/lib/messages'

export const legalPageSchema = z.object({
  title: z.string().min(1, messages.validation.titleRequired),
  content: z.any(),
  is_published: z.boolean().default(false),
})

export type LegalPageFormData = z.infer<typeof legalPageSchema>
