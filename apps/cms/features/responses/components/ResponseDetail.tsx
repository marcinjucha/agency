import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getResponse, getResponseAiActionResults } from '../queries'
import type { ResponseWithRelations, QuestionAnswerPair, AiActionResult } from '../types'
import {
  Button, Card, Badge, LoadingState, ErrorState, EmptyState,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, FileX, Loader2, AlertTriangle, Trash2, Bot } from 'lucide-react'
import { getResponseStatusColor } from '@/lib/utils/status'
import { triggerAiAnalysisFn, deleteResponseFn } from '../server-fns'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [aiPhase, setAiPhase] = useState<'polling' | 'failed'>('polling')
  const [deleting, setDeleting] = useState(false)
  const { data: response, isLoading, error } = useQuery({
    queryKey: queryKeys.responses.detail(responseId),
    queryFn: () => getResponse(responseId),
    enabled: !!responseId,
    refetchInterval: (query) => {
      if (query.state.data?.ai_qualification) return false
      if (aiPhase === 'failed') return false
      return 10000
    },
  })

  const {
    data: aiActionResults,
    isLoading: isLoadingAiActionResults,
  } = useQuery({
    queryKey: queryKeys.responses.aiActionResults(responseId),
    queryFn: () => getResponseAiActionResults(responseId),
    enabled: !!responseId,
  })

  useEffect(() => {
    if (response?.ai_qualification || aiPhase === 'failed') return

    const interval = setInterval(() => {
      setRetryAttempt((prev) => {
        if (prev >= MAX_RETRIES) {
          setAiPhase('failed')
          return prev
        }
        triggerAiAnalysisFn({ data: { responseId } })
        return prev + 1
      })
    }, POLLS_PER_ATTEMPT * 10000)

    return () => clearInterval(interval)
  }, [retryAttempt, aiPhase, response?.ai_qualification, responseId])

  const handleManualRetry = async () => {
    setRetryAttempt(0)
    setAiPhase('polling')
    await triggerAiAnalysisFn({ data: { responseId } })
  }

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
              {response.survey_links?.token ? response.survey_links.token.slice(0, 8) + '...' : messages.responses.unknown}
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

      {/* AI Qualification Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{messages.responses.aiAnalysis}</h2>
        {!response.ai_qualification ? (
          aiPhase === 'failed' ? (
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-2 text-status-warning-foreground">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{messages.responses.analysisUnavailable}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleManualRetry}
                disabled={aiPhase !== 'failed'}
                className="w-fit"
              >
                {messages.common.retryAnalysis}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">
                {retryAttempt === 0
                  ? messages.responses.analyzingResponse
                  : messages.responses.retryingAnalysis(retryAttempt, MAX_RETRIES)}
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
                <span>{messages.responses.overall}: <strong className="text-foreground">{response.ai_qualification.overall_score}/10</strong></span>
                <span>{messages.responses.urgency}: <strong className="text-foreground">{response.ai_qualification.urgency_score}/10</strong></span>
                <span>{messages.responses.value}: <strong className="text-foreground">{response.ai_qualification.value_score}/10</strong></span>
                <span>{messages.responses.complexity}: <strong className="text-foreground">{response.ai_qualification.complexity_score}/10</strong></span>
                <span>{messages.responses.success}: <strong className="text-foreground">{response.ai_qualification.success_probability}/10</strong></span>
              </div>
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{messages.responses.summary}</p>
              <p className="text-sm text-foreground">{response.ai_qualification.summary}</p>
            </div>

            {/* Notes for lawyer */}
            {response.ai_qualification.notes_for_lawyer.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{messages.responses.notesForLawyer}</p>
                <ul className="list-disc list-inside space-y-2">
                  {response.ai_qualification.notes_for_lawyer.map((note, i) => (
                    <li key={i} className="text-sm text-foreground">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meta */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              Przeanalizowano {new Date(response.ai_qualification.analyzed_at).toLocaleString('pl-PL')} · {response.ai_qualification.model}
            </div>
          </div>
        )}
      </Card>

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
                  {Object.entries(result.outputPayload).map(([key, value]) => {
                    const label = result.outputSchema.find((f) => f.key === key)?.label ?? key
                    return (
                    <div key={key}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{label}</p>
                      <div className="bg-muted rounded-lg p-3 border border-border">
                        {typeof value === 'object' && value !== null ? (
                          <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {String(value)}
                          </p>
                        )}
                      </div>
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
