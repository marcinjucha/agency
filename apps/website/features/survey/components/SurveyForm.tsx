/**
 * SurveyForm Component
 *
 * Main composite form component that orchestrates the entire survey experience.
 * Integrates React Hook Form with dynamic Zod validation and handles submission flow.
 *
 * ARCHITECTURE:
 * - Composite pattern: Uses QuestionField child components for each question
 * - Form state: React Hook Form with zodResolver
 * - Validation: Dynamic schema generated from survey questions
 * - Submission: Server Action with error handling and success redirect
 * - Loading states: Disables form during submission
 *
 * KEY IMPLEMENTATION DETAILS:
 * 1. Schema Generation: generateSurveySchema(questions) creates dynamic Zod schema
 * 2. Question Sorting: Questions sorted by order field before rendering
 * 3. Form Props: Passes register + control to QuestionField for different input types
 * 4. Error Handling: Field errors from Zod validation, submission errors above button
 * 5. Success Flow: Router push to /survey/{token}/success on successful submission
 *
 * @module apps/website/features/survey/components/SurveyForm
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@agency/ui'
import { QuestionField } from './QuestionField'
import { generateSurveySchema } from '../validation'
import type { SurveyData, SurveyAnswers } from '../types'
import { messages } from '@/lib/messages'

interface SurveyFormProps {
  /** Survey data including title, description, and questions */
  survey: SurveyData
  /** Survey link UUID for tracking submissions */
  linkId: string
  /** Survey link token for success page redirect */
  token: string
}

export function SurveyForm({ survey, linkId, token }: SurveyFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Generate dynamic Zod schema from survey questions
  // Schema validates based on question types and required flags
  const schema = generateSurveySchema(survey.questions)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SurveyAnswers>({
    resolver: zodResolver(schema as any),
  })

  const onSubmit = async (data: SurveyAnswers) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkId,
          surveyId: survey.id,
          answers: data,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to success page with responseId and linkId for calendar booking
        const params = new URLSearchParams()
        if (result.responseId) params.append('responseId', result.responseId)
        if (result.linkId) params.append('linkId', result.linkId)
        const queryString = params.toString() ? `?${params.toString()}` : ''
        router.push(`/survey/${token}/success${queryString}`)
      } else {
        // Display error message from API
        setSubmitError(result.error || messages.survey.submitFailed)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitError(messages.survey.unexpectedError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Sort questions by order field to ensure correct display sequence
  const sortedQuestions = [...survey.questions].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-xl border-0">
          <div className="p-8 sm:p-12">
            {/* Survey Header */}
            <div className="mb-8 pb-6 border-b border-border">
              <h1 className="text-4xl font-bold text-foreground mb-3">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-lg text-muted-foreground">{survey.description}</p>
              )}
            </div>

            {/* Survey Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Render questions in sorted order */}
              {sortedQuestions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  register={register}
                  control={control}
                  error={errors[question.id]?.message as string | undefined}
                />
              ))}

              {/* Submission Error Alert */}
              {submitError && (
                <div
                  className="bg-destructive/10 border-l-4 border-destructive text-destructive px-6 py-4 rounded-r shadow-sm"
                  role="alert"
                >
                  <p className="font-medium">{messages.survey.submissionError}</p>
                  <p className="text-sm mt-1">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {messages.survey.submitting}
                    </span>
                  ) : (
                    messages.survey.submitSurvey
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
