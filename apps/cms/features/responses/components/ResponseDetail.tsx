'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getResponse } from '../queries'
import type { ResponseWithRelations, QuestionAnswerPair } from '../types'
import { Button, Card, Badge, LoadingState, ErrorState, EmptyState } from '@agency/ui'
import Link from 'next/link'
import { ArrowLeft, FileX, Loader2, AlertTriangle } from 'lucide-react'
import { getResponseStatusColor } from '@/lib/utils/status'
import { triggerAiAnalysis } from '../actions'

type ResponseDetailProps = {
  responseId: string
}

/**
 * ResponseDetail Component
 *
 * Displays a single response with all question-answer pairs, metadata, and AI qualification.
 *
 * Features:
 * - TanStack Query data fetching with loading/error states
 * - Response metadata (survey title, submission date, status)
 * - Question-answer pair display with proper formatting
 * - Checkbox array handling (comma-separated)
 * - Missing question fallback
 * - AI qualification placeholder (Phase 5 ready)
 * - Professional responsive layout
 *
 * @example
 * <ResponseDetail responseId="r-123" />
 */
const MAX_RETRIES = 3
const POLLS_PER_ATTEMPT = 3

export function ResponseDetail({ responseId }: ResponseDetailProps) {
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [aiPhase, setAiPhase] = useState<'polling' | 'failed'>('polling')
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['response', responseId],
    queryFn: () => getResponse(responseId),
    enabled: !!responseId,
    refetchInterval: (query) => {
      if (query.state.data?.ai_qualification) return false
      if (aiPhase === 'failed') return false
      return 10000
    },
  })

  useEffect(() => {
    if (response?.ai_qualification || aiPhase === 'failed') return

    const interval = setInterval(() => {
      setRetryAttempt((prev) => {
        if (prev >= MAX_RETRIES) {
          setAiPhase('failed')
          return prev
        }
        triggerAiAnalysis(responseId)
        return prev + 1
      })
    }, POLLS_PER_ATTEMPT * 10000)

    return () => clearInterval(interval)
  }, [retryAttempt, aiPhase, response?.ai_qualification, responseId])

  const handleManualRetry = async () => {
    setRetryAttempt(0)
    setAiPhase('polling')
    await triggerAiAnalysis(responseId)
  }

  // Loading state
  if (isLoading) {
    return <LoadingState variant="spinner" message="Loading response..." />
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Error loading response"
        message={error.message}
        variant="inline"
      />
    )
  }

  // Not found state
  if (!response) {
    return (
      <EmptyState
        icon={FileX}
        title="Response not found"
        description="This response may have been deleted or you don't have access to it."
        variant="card"
        action={
          <Link href="/admin/responses">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Responses
            </Button>
          </Link>
        }
      />
    )
  }

  // Get survey data from the response
  const survey = response.surveys
  const surveyTitle = survey?.title || 'Unknown Survey'
  const questions = survey?.questions || []

  // Build question-answer pairs
  const questionAnswerPairs: QuestionAnswerPair[] = questions.map((question) => ({
    question,
    answer: response.answers[question.id],
  }))

  // Format submission date
  const submissionDate = response.created_at
    ? new Date(response.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown date'

  return (
    <div className="space-y-6">
      {/* Header Card - Metadata */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">{surveyTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Submitted on {submissionDate}
            </p>
          </div>
          <Badge className={`${getResponseStatusColor(response.status)} px-3 py-1 rounded-full text-sm font-medium`}>
            {response.status || 'Pending'}
          </Badge>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Response ID</p>
            <p className="text-sm text-foreground font-mono mt-1">{response.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Survey Link</p>
            <p className="text-sm text-foreground font-mono mt-1">
              {response.survey_links?.token ? response.survey_links.token.slice(0, 8) + '...' : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Last Updated</p>
            <p className="text-sm text-foreground mt-1">
              {response.updated_at
                ? new Date(response.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Never'}
            </p>
          </div>
        </div>
      </Card>

      {/* Question-Answer Pairs */}
      {questionAnswerPairs.length > 0 ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Responses</h2>
          <div className="space-y-6">
            {questionAnswerPairs.map((pair, index) => (
              <div key={pair.question.id} className={index > 0 ? 'pt-6 border-t border-border' : ''}>
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground">
                    {pair.question.question}
                  </h3>
                  {pair.question.required && (
                    <p className="text-xs text-muted-foreground mt-1">Required field</p>
                  )}
                </div>

                {/* Answer Value */}
                <div className="bg-muted rounded-lg p-4 border border-border">
                  {!pair.answer || (Array.isArray(pair.answer) && pair.answer.length === 0) ? (
                    <p className="text-muted-foreground italic">No answer provided</p>
                  ) : Array.isArray(pair.answer) ? (
                    // Checkbox array - join with commas
                    <p className="text-foreground whitespace-pre-wrap break-words">
                      {pair.answer.join(', ')}
                    </p>
                  ) : (
                    // String answer
                    <p className="text-foreground whitespace-pre-wrap break-words">
                      {String(pair.answer)}
                    </p>
                  )}
                </div>

                {/* Question metadata */}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Type: {pair.question.type}</span>
                  {pair.question.options && pair.question.options.length > 0 && (
                    <span>{pair.question.options.length} options</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-center text-muted-foreground">No questions in this survey</p>
        </Card>
      )}

      {/* AI Qualification Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">AI Analysis</h2>
        {!response.ai_qualification ? (
          aiPhase === 'failed' ? (
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-2 text-status-warning-foreground">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">Analysis unavailable</p>
              </div>
              <Button
                variant="outline"
                onClick={handleManualRetry}
                disabled={aiPhase !== 'failed'}
                className="w-fit"
              >
                Retry Analysis
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">
                {retryAttempt === 0
                  ? 'Analyzing response...'
                  : `Retrying analysis... (${retryAttempt}/${MAX_RETRIES})`}
              </p>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Recommendation + Scores */}
            <div className="flex flex-wrap items-center gap-4">
              <Badge
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  response.ai_qualification.recommendation === 'QUALIFIED'
                    ? 'bg-success/15 text-success'
                    : response.ai_qualification.recommendation === 'DISQUALIFIED'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-status-warning/15 text-status-warning-foreground'
                }`}
              >
                {response.ai_qualification.recommendation}
              </Badge>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Overall: <strong className="text-foreground">{response.ai_qualification.overall_score}/10</strong></span>
                <span>Urgency: <strong className="text-foreground">{response.ai_qualification.urgency_score}/10</strong></span>
                <span>Value: <strong className="text-foreground">{response.ai_qualification.value_score}/10</strong></span>
                <span>Complexity: <strong className="text-foreground">{response.ai_qualification.complexity_score}/10</strong></span>
                <span>Success: <strong className="text-foreground">{response.ai_qualification.success_probability}/10</strong></span>
              </div>
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Summary</p>
              <p className="text-sm text-foreground">{response.ai_qualification.summary}</p>
            </div>

            {/* Notes for lawyer */}
            {response.ai_qualification.notes_for_lawyer.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notes for Lawyer</p>
                <ul className="list-disc list-inside space-y-2">
                  {response.ai_qualification.notes_for_lawyer.map((note, i) => (
                    <li key={i} className="text-sm text-foreground">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meta */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              Analyzed {new Date(response.ai_qualification.analyzed_at).toLocaleString('pl-PL')} · {response.ai_qualification.model}
            </div>
          </div>
        )}
      </Card>

      {/* Actions Footer - Placeholder */}
      <Card className="p-6 bg-muted border-border">
        <p className="text-sm text-muted-foreground">
          More actions coming in Phase 5 (status update, notes, export, etc.)
        </p>
      </Card>
    </div>
  )
}
