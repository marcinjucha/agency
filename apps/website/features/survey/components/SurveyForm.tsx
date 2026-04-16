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
 * @module apps/website/features/survey/components/SurveyForm
 */

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Button, Card, Progress } from '@agency/ui'
import { Loader2 } from 'lucide-react'
import { QuestionField } from './QuestionField'
import { generateSurveySchema } from '../validation'
import type { SurveyData, SurveyAnswers } from '../types'
import { messages } from '@/lib/messages'
import { submitResponseFn } from '../server'

interface SurveyFormProps {
  /** Survey data including title, description, and questions */
  survey: SurveyData
  /** Survey link UUID for tracking submissions */
  linkId: string
  /** Survey link token for success page redirect */
  token: string
}

export function SurveyForm({ survey, linkId, token }: SurveyFormProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    // Analytics: survey started — plausible is not used in TanStack Start iteration
  }, [])

  // Generate dynamic Zod schema from survey questions
  const schema = useMemo(
    () => generateSurveySchema(survey.questions),
    [survey.questions]
  )

  // Default values ensure zodResolver receives strings (not undefined)
  const defaultValues = useMemo(() => {
    const values: SurveyAnswers = {}
    survey.questions.forEach((q) => {
      values[q.id] = q.type === 'checkbox' ? [] : ''
    })
    return values
  }, [survey.questions])

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<SurveyAnswers>({
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: 'onTouched',
  })

  // Sort questions by order field to ensure correct display sequence
  const sortedQuestions = useMemo(
    () => [...survey.questions].sort((a, b) => a.order - b.order),
    [survey.questions]
  )

  // Track progress — count filled required fields vs total required
  const watchedValues = watch()
  const totalRequired = sortedQuestions.filter((q) => q.required).length
  const filledRequired = sortedQuestions.filter((q) => {
    if (!q.required) return false
    const val = watchedValues[q.id]
    if (val == null) return false
    if (typeof val === 'string') return val.trim().length > 0
    if (Array.isArray(val)) return val.length > 0
    return Boolean(val)
  }).length
  const progressPercent =
    totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 0

  const onSubmit = async (data: SurveyAnswers) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitResponseFn({
        data: { linkId, surveyId: survey.id, answers: data },
      })

      if (result.success) {
        void navigate({
          to: '/survey/$token/success',
          params: { token },
          search: {
            responseId: result.responseId,
            linkId: result.linkId,
          },
        })
      } else {
        setSubmitError(result.error || messages.survey.submitFailed)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitError(messages.survey.unexpectedError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-border">
          <div className="p-8 sm:p-12">
            {/* Survey Header */}
            <div className="mb-8 pb-6 border-b border-border">
              <h1 className="text-4xl font-bold text-foreground mb-3">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-lg text-muted-foreground">
                  {survey.description}
                </p>
              )}
            </div>

            {/* Progress Indicator */}
            {sortedQuestions.length > 1 && (
              <div className="mb-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {messages.survey.questionProgress(
                    filledRequired,
                    totalRequired
                  )}
                </p>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Survey Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Render questions in sorted order with numbering */}
              {sortedQuestions.map((question, index) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  control={control}
                  number={index + 1}
                />
              ))}

              {/* Submission Error Alert */}
              {submitError && (
                <div
                  className="bg-destructive/10 border-l-4 border-destructive text-destructive px-6 py-4 rounded-r"
                  role="alert"
                >
                  <p className="font-medium">
                    {messages.survey.submissionError}
                  </p>
                  <p className="text-sm mt-1">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="w-full h-12 text-lg font-semibold"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
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
