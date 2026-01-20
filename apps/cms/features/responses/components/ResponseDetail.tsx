'use client'

import { useQuery } from '@tanstack/react-query'
import { getResponse } from '../queries'
import type { ResponseWithRelations, QuestionAnswerPair } from '../types'
import { Button, Card, Badge } from '@legal-mind/ui'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getResponseStatusColor } from '@/lib/utils/status'

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
export function ResponseDetail({ responseId }: ResponseDetailProps) {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['response', responseId],
    queryFn: () => getResponse(responseId),
    enabled: !!responseId,
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading response...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700 font-semibold mb-2">Error loading response</p>
        <p className="text-red-600 text-sm">{error.message}</p>
      </div>
    )
  }

  // Not found state
  if (!response) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-700 font-semibold mb-2">Response not found</p>
        <p className="text-gray-600 text-sm mb-6">
          This response may have been deleted or you don't have access to it.
        </p>
        <Link href="/admin/responses">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Responses
          </Button>
        </Link>
      </div>
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
      {/* Back Button */}
      <div>
        <Link href="/admin/responses">
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Responses
          </Button>
        </Link>
      </div>

      {/* Header Card - Metadata */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{surveyTitle}</h1>
            <p className="text-sm text-gray-600">
              Submitted on {submissionDate}
            </p>
          </div>
          <Badge className={`${getResponseStatusColor(response.status)} px-3 py-1 rounded-full text-sm font-medium`}>
            {response.status || 'Pending'}
          </Badge>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Response ID</p>
            <p className="text-sm text-gray-900 font-mono mt-1">{response.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Survey Link</p>
            <p className="text-sm text-gray-900 font-mono mt-1">
              {response.survey_links?.token ? response.survey_links.token.slice(0, 8) + '...' : 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Last Updated</p>
            <p className="text-sm text-gray-900 mt-1">
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
          <h2 className="text-lg font-bold text-gray-900 mb-6">Responses</h2>
          <div className="space-y-6">
            {questionAnswerPairs.map((pair, index) => (
              <div key={pair.question.id} className={index > 0 ? 'pt-6 border-t border-gray-200' : ''}>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {pair.question.question}
                  </h3>
                  {pair.question.required && (
                    <p className="text-xs text-gray-500 mt-1">Required field</p>
                  )}
                </div>

                {/* Answer Value */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {!pair.answer || (Array.isArray(pair.answer) && pair.answer.length === 0) ? (
                    <p className="text-gray-500 italic">No answer provided</p>
                  ) : Array.isArray(pair.answer) ? (
                    // Checkbox array - join with commas
                    <p className="text-gray-900 whitespace-pre-wrap break-words">
                      {pair.answer.join(', ')}
                    </p>
                  ) : (
                    // String answer
                    <p className="text-gray-900 whitespace-pre-wrap break-words">
                      {String(pair.answer)}
                    </p>
                  )}
                </div>

                {/* Question metadata */}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
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
          <p className="text-center text-gray-500">No questions in this survey</p>
        </Card>
      )}

      {/* AI Qualification Section - Phase 5 Placeholder */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">AI Qualification Analysis</h2>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5h.01M15 9h.01" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold mb-2">Coming in Phase 5</p>
          <p className="text-gray-600 text-sm">
            AI-powered qualification analysis will appear here once configured.
            This will include scoring, recommendations, and insights about the applicant.
          </p>
        </div>
      </Card>

      {/* Actions Footer - Placeholder */}
      <Card className="p-6 bg-gray-50 border-gray-200">
        <p className="text-sm text-gray-600">
          More actions coming in Phase 5 (status update, notes, export, etc.)
        </p>
      </Card>
    </div>
  )
}
