/**
 * Survey Form Validation
 *
 * Dynamic Zod schema generation based on survey questions.
 * Each question type has specific validation rules applied at runtime.
 *
 * @module apps/website/features/survey/validation
 */

import { z } from 'zod'
import type { Question } from './types'
import { messages } from '@/lib/messages'

/**
 * Dynamically generate Zod schema from survey questions
 *
 * Iterates through questions array and builds validation schema
 * with type-specific rules for each question type:
 * - text/textarea: String validation, min(1) if required
 * - email: Email format + required check
 * - tel: International phone number regex
 * - select/radio: Enum validation from options
 * - checkbox: Array validation with min(1) if required
 *
 * @param questions - Array of survey questions from database
 * @returns Zod object schema with dynamic shape
 *
 * @example
 * const schema = generateSurveySchema(survey.questions)
 * const result = schema.safeParse(formData)
 * if (!result.success) {
 *   // Handle validation errors: result.error.flatten().fieldErrors
 * }
 */
export function generateSurveySchema(questions: Question[]) {
  const schemaShape: Record<string, any> = {}

  questions.forEach((question) => {
    let fieldSchema: any

    switch (question.type) {
      case 'text':
      case 'textarea': {
        const textSchema = z.string()
        fieldSchema = question.required
          ? textSchema.min(1, messages.validation.fieldRequired)
          : textSchema
        break
      }

      case 'email': {
        const emailSchema = z.string().email(messages.validation.invalidEmail)
        fieldSchema = question.required
          ? emailSchema.min(1, messages.validation.emailRequired)
          : emailSchema
        break
      }

      case 'tel': {
        const telSchema = z
          .string()
          .regex(
            /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
            {
              message: messages.validation.invalidPhone,
            }
          )
        fieldSchema = question.required
          ? telSchema.min(1, messages.validation.phoneRequired)
          : telSchema
        break
      }

      case 'select':
      case 'radio': {
        let selectSchema: any
        if (question.options && question.options.length > 0) {
          selectSchema = z.enum(question.options as [string, ...string[]])
        } else {
          selectSchema = z.string()
        }
        fieldSchema = question.required
          ? selectSchema.refine((val: string) => val !== '', {
              message: messages.validation.selectOption,
            })
          : selectSchema
        break
      }

      case 'checkbox': {
        const checkboxSchema = z.array(z.string())
        fieldSchema = question.required
          ? checkboxSchema.min(1, messages.validation.selectAtLeastOne)
          : checkboxSchema
        break
      }

      case 'date': {
        const dateSchema = z.string()
        fieldSchema = question.required
          ? dateSchema.min(1, messages.validation.fieldRequired)
          : dateSchema
        break
      }

      case 'consent': {
        // Consent is ALWAYS required regardless of question.required — GDPR compliance.
        // Value is string "true" when checked (set by QuestionField checkbox).
        // Early return to bypass the optional() wrap below.
        schemaShape[question.id] = z
          .string()
          .refine((val) => val === 'true', {
            message: messages.validation.consentRequired,
          })
        return
      }

      default:
        fieldSchema = z.string()
    }

    // Make optional if not required
    if (!question.required) {
      fieldSchema = fieldSchema.optional()
    }

    // Use question.id as key (matches form field names)
    schemaShape[question.id] = fieldSchema
  })

  return z.object(schemaShape)
}

/**
 * Type helper for form data inferred from generated schema
 *
 * This type represents validated form data that has passed
 * through the dynamic schema validation.
 *
 * Structure: Record<questionId, string | string[]>
 * - Question IDs are keys
 * - Values are either:
 *   - string: for text, textarea, email, tel, select, radio
 *   - string[]: for checkbox (multiple selections)
 *   - undefined: for optional fields that weren't filled
 */
export type SurveyFormData = z.infer<ReturnType<typeof generateSurveySchema>>
