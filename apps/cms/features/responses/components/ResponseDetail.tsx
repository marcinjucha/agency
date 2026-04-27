import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getResponseFn, getResponseAiActionResultsFn } from '../server'
import type { ResponseWithRelations, QuestionAnswerPair, AiActionResult } from '../types'
import {
  Button, Card, Badge, LoadingState, ErrorState, EmptyState,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, FileX, Loader2, Trash2, Bot } from 'lucide-react'
import { getResponseStatusColor } from '@/lib/utils/status'
import { deleteResponseFn } from '../server'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { resolveOutputValue } from '../utils/resolveOutputValue'

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const { data: response, isLoading, error } = useQuery({
    queryKey: queryKeys.responses.detail(responseId),
    queryFn: () => getResponseFn({ data: { id: responseId } }),
    enabled: !!responseId,
  })

  const {
    data: aiActionResults,
    isLoading: isLoadingAiActionResults,
  } = useQuery({
    queryKey: queryKeys.responses.aiActionResults(responseId),
    queryFn: () => getResponseAiActionResultsFn({ data: { responseId } }),
    enabled: !!responseId,
  })

  // Loading state
  if (isLoading) {
    return <LoadingState variant="spinner" message={messages.responses.loadingResponse} />
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title={messages.responses.loadError}
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
        title={messages.responses.notFound}
        description={messages.responses.notFoundDescription}
        variant="card"
        action={
          <Link to={routes.admin.responses}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {messages.responses.backToResponses}
            </Button>
          </Link>
        }
      />
    )
  }

  // Get survey data from the response
  const survey = response.surveys
  const surveyTitle = survey?.title || messages.responses.unknown
  const questions = survey?.questions || []

  // Build question-answer pairs
  const questionAnswerPairs: QuestionAnswerPair[] = questions.map((question) => ({
    question,
    answer: response.answers[question.id],
  }))

  // Format submission date
  const submissionDate = response.created_at
    ? new Date(response.created_at).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : messages.responses.unknown

  return (
    <div className="space-y-6">
      {/* Header Card - Metadata */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">{surveyTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {messages.responses.submittedOn(submissionDate)}
            </p>
          </div>
          <Badge className={`${getResponseStatusColor(response.status)} px-3 py-1 rounded-full text-sm font-medium`}>
            {response.status || 'Oczekuje'}
          </Badge>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">{messages.responses.responseId}</p>
            <p className="text-sm text-foreground font-mono mt-1">{response.id}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">{messages.responses.surveyLink}</p>
            <p className="text-sm text-foreground font-mono mt-1">
              {response.survey_links?.id ?? messages.responses.unknown}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">{messages.responses.lastUpdated}</p>
            <p className="text-sm text-foreground mt-1">
              {response.updated_at
                ? new Date(response.updated_at).toLocaleDateString('pl-PL', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : messages.responses.neverUpdated}
            </p>
          </div>
        </div>
      </Card>

      {/* Question-Answer Pairs */}
      {questionAnswerPairs.length > 0 ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">{messages.responses.responsesSection}</h2>
          <div className="space-y-6">
            {questionAnswerPairs.map((pair, index) => (
              <div key={pair.question.id} className={index > 0 ? 'pt-6 border-t border-border' : ''}>
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground">
                    {pair.question.question}
                  </h3>
                  {pair.question.required && (
                    <p className="text-xs text-muted-foreground mt-1">{messages.responses.requiredField}</p>
                  )}
                </div>

                {/* Answer Value */}
                <div className="bg-muted rounded-lg p-4 border border-border">
                  {!pair.answer || (Array.isArray(pair.answer) && pair.answer.length === 0) ? (
                    <p className="text-muted-foreground italic">{messages.responses.noAnswer}</p>
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
                  <span>{messages.responses.typeLabel(pair.question.type)}</span>
                  {pair.question.options && pair.question.options.length > 0 && (
                    <span>{messages.responses.optionsCount(pair.question.options.length)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-center text-muted-foreground">{messages.responses.noQuestionsInSurvey}</p>
        </Card>
      )}

      {/* AI Workflow Results Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">{messages.responses.aiWorkflowTitle}</h2>
        </div>

        {isLoadingAiActionResults ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">{messages.responses.aiWorkflowLoading}</p>
          </div>
        ) : !aiActionResults || aiActionResults.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 italic">
            {messages.responses.aiWorkflowEmpty}
          </p>
        ) : (
          <div className="space-y-6">
            {aiActionResults.map((result: AiActionResult, index: number) => (
              <div key={index} className={index > 0 ? 'pt-6 border-t border-border' : ''}>
                {/* Result header: workflow name + timestamp */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p className="text-sm font-semibold text-foreground">
                    {result.workflowName}
                    {aiActionResults.length > 1 && ` — Krok ${index + 1}`}
                  </p>
                  {result.completedAt && (
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(result.completedAt).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>

                {/* Output payload: key-value pairs with human-readable labels from output_schema */}
                <div className="space-y-3">
                  {Object.entries(result.outputPayload).filter(([key]) => key !== 'aiOutputJson').map(([key, value]) => {
                    const label = result.outputSchema.find((f) => f.key === key)?.label ?? key

                    // Resolve the display value — may be an object, a fenced-JSON string, or a plain string
                    const resolved = resolveOutputValue(value)

                    return (
                      <div key={key}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</p>
                        {resolved.kind === 'object' ? (
                          <dl className="space-y-2 rounded-lg border border-border bg-muted p-3">
                            {Object.entries(resolved.data).map(([k, v]) => (
                              <div key={k} className="flex flex-col gap-0.5">
                                <dt className="text-xs text-muted-foreground capitalize">
                                  {k}
                                </dt>
                                <dd className="text-sm text-foreground break-words">
                                  {typeof v === 'object' && v !== null
                                    ? JSON.stringify(v)
                                    : String(v)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <div className="rounded-lg border border-border bg-muted p-3">
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                              {resolved.text}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions Footer */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {messages.responses.moreActionsComing}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {messages.common.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.responses.deleteResponseConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {response.has_appointment
                    ? messages.responses.deleteResponseWithAppointmentDescription
                    : messages.responses.deleteResponseConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setDeleting(true)
                    const result = await deleteResponseFn({ data: { id: responseId } })
                    if (result.success) {
                      queryClient.invalidateQueries({ queryKey: queryKeys.responses.all })
                      if (result.hadAppointment) queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
                      navigate({ to: routes.admin.responses })
                    } else {
                      setDeleting(false)
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {messages.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  )
}
