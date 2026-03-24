import { z } from 'zod'

// --- Create survey schema ---

export const createSurveySchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany'),
  description: z.string().optional(),
})

// --- Update survey schema ---

export const updateSurveySchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany').optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  questions: z.array(z.any()).optional(),
})

// --- Generate survey link schema ---

export const generateSurveyLinkSchema = z.object({
  surveyId: z.string().uuid('Nieprawidłowy identyfikator ankiety'),
  notificationEmail: z.string().email('Nieprawidłowy adres email'),
  expiresAt: z.string().datetime({ message: 'Nieprawidłowy format daty' }).optional(),
  maxSubmissions: z
    .number()
    .int('Liczba wypełnień musi być liczbą całkowitą')
    .positive('Liczba wypełnień musi być większa od zera')
    .optional()
    .nullable(),
})

// --- Inferred types ---

export type CreateSurveyFormData = z.infer<typeof createSurveySchema>
export type UpdateSurveyFormData = z.infer<typeof updateSurveySchema>
export type GenerateSurveyLinkFormData = z.infer<typeof generateSurveyLinkSchema>
