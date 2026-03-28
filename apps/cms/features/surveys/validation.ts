import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- Create survey schema ---

export const createSurveySchema = z.object({
  title: z.string().min(1, messages.validation.titleRequired),
  description: z.string().optional(),
})

// --- Update survey schema ---

export const updateSurveySchema = z.object({
  title: z.string().min(1, messages.validation.titleRequired).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  questions: z.array(z.any()).optional(),
})

// --- Generate survey link schema ---

export const generateSurveyLinkSchema = z.object({
  surveyId: z.string().uuid(messages.validation.invalidSurveyId),
  notificationEmail: z.string().email(messages.validation.invalidEmail),
  expiresAt: z.string().min(1).optional(),
  maxSubmissions: z
    .number()
    .int(messages.validation.submissionsMustBeInteger)
    .positive(messages.validation.submissionsMustBePositive)
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
})

// --- Update survey link schema ---

export const updateSurveyLinkSchema = z.object({
  notificationEmail: z.string().email(messages.validation.invalidEmail),
  expiresAt: z
    .string()
    .min(1)
    .nullable()
    .optional(),
  maxSubmissions: z
    .number()
    .int(messages.validation.submissionsMustBeInteger)
    .positive(messages.validation.submissionsMustBePositive)
    .nullable()
    .optional(),
  isActive: z.boolean(),
})

// --- Inferred types ---

export type CreateSurveyFormData = z.infer<typeof createSurveySchema>
export type UpdateSurveyFormData = z.infer<typeof updateSurveySchema>
export type GenerateSurveyLinkFormData = z.infer<typeof generateSurveyLinkSchema>
export type UpdateSurveyLinkFormData = z.infer<typeof updateSurveyLinkSchema>
