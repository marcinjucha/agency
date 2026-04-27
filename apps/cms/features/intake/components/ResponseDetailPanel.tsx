import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@agency/ui'
import { X, ExternalLink, Calendar, CheckCircle2, Loader2, Trash2, Mail, Building2, Phone, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { updateResponseStatusFn, updateInternalNotesFn } from '../server'
import { deleteResponseFn, getResponseAiActionResultsFn } from '../../responses/server'
import { resolveOutputValue } from '../../responses/utils/resolveOutputValue'
import { getResponseStatusColor } from '@/lib/utils/status'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { RESPONSE_STATUSES } from '../validation'
import { STATUS_LABELS, APPOINTMENT_STATUS_LABELS } from '../types'
import type { PipelineResponse, ResponseStatus } from '../types'
import type { AiActionResult } from '../../responses/types'
import type { Question, SurveyAnswers } from '../../responses/types'

interface ResponseDetailPanelProps {
  response: PipelineResponse
  onClose: () => void
}

/** Build Q&A pairs from questions and answers */
function buildQuestionAnswerPairs(
  questions: unknown[],
  answers: SurveyAnswers
): { question: Question; answer: string | string[] | undefined }[] {
  return (questions as Question[]).map((q) => ({
    question: q,
    answer: answers[q.id],
  }))
}

/** Convert camelCase key to readable label — e.g. "overallScore" → "Overall Score" */
function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/** Format date in Polish locale */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ResponseDetailPanel({ response, onClose }: ResponseDetailPanelProps) {
  const queryClient = useQueryClient()
  const [notesValue, setNotesValue] = useState('')
  const [notesSaveState, setNotesSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [aiSectionCollapsed, setAiSectionCollapsed] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteResponseFn({ data: { id } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intake.all })
      setShowDeleteConfirm(false)
      onClose()
    },
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local notes with selected response
  useEffect(() => {
    setNotesValue(response.internalNotes ?? '')
    setNotesSaveState('idle')
  }, [response.id, response.internalNotes])

  const notesMutation = useMutation({
    mutationFn: async ({ responseId, notes }: { responseId: string; notes: string }) => {
      const result = await updateInternalNotesFn({ data: { responseId, notes } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intake.pipeline })
      setNotesSaveState('saved')
      setTimeout(() => setNotesSaveState('idle'), 2000)
    },
    onError: () => {
      setNotesSaveState('error')
    },
  })

  /** Autosave notes with 1s debounce */
  const autosaveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (value !== (response.internalNotes ?? '')) {
          notesMutation.mutate({ responseId: response.id, notes: value })
        }
      }, 1000)
    },
    [response.id, response.internalNotes, notesMutation]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const statusMutation = useMutation({
    mutationFn: async ({ responseId, newStatus }: { responseId: string; newStatus: string }) => {
      const result = await updateResponseStatusFn({ data: { responseId, status: newStatus } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intake.pipeline })
    },
  })

  const { data: aiActionResults, isLoading: isLoadingAi } = useQuery({
    queryKey: queryKeys.responses.aiActionResults(response.id),
    queryFn: () => getResponseAiActionResultsFn({ data: { responseId: response.id } }),
  })

  const qaPairs = buildQuestionAnswerPairs(response.surveyQuestions, response.answers)

  return (
    <div className="w-[480px] min-w-[480px] h-full flex flex-col bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {response.clientName}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {response.surveyTitle}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              to={routes.admin.response(response.id)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              aria-label={messages.intake.sheetOpenFullPage}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label={messages.common.close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status + date row */}
        <div className="flex items-center gap-3 mt-3">
          <Badge
            className={`${getResponseStatusColor(response.status)} px-2.5 py-0.5 rounded-full text-xs font-medium`}
          >
            {STATUS_LABELS[response.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(response.createdAt)}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Client Contact Info (from semantic_role) */}
        {(response.clientEmail || response.companyName || response.phone) && (
          <>
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {messages.intake.sheetClientInfo}
              </h3>
              <div className="space-y-2">
                {response.clientEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={`mailto:${response.clientEmail}`}
                      className="text-foreground hover:underline truncate"
                    >
                      {response.clientEmail}
                    </a>
                  </div>
                )}
                {response.companyName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{response.companyName}</span>
                  </div>
                )}
                {response.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={`tel:${response.phone}`}
                      className="text-foreground hover:underline"
                    >
                      {response.phone}
                    </a>
                  </div>
                )}
              </div>
            </section>
            <div className="border-t border-border" />
          </>
        )}

        {/* Q&A Section */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {messages.responses.responsesSection}
          </h3>
          <div className="space-y-3">
            {qaPairs.length > 0 ? (
              qaPairs.map((pair) => (
                <div key={pair.question.id}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {pair.question.question}
                  </p>
                  <div className="bg-muted rounded-md px-3 py-2">
                    {!pair.answer || (Array.isArray(pair.answer) && pair.answer.length === 0) ? (
                      <p className="text-sm text-muted-foreground italic">
                        {messages.responses.noAnswer}
                      </p>
                    ) : Array.isArray(pair.answer) ? (
                      <p className="text-sm text-foreground break-words">
                        {pair.answer.join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                        {String(pair.answer)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {messages.responses.noQuestionsInSurvey}
              </p>
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* AI Workflow Results */}
        <section>
          <button
            type="button"
            onClick={() => setAiSectionCollapsed((prev) => !prev)}
            className="flex items-center gap-2 w-full text-left mb-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            aria-expanded={!aiSectionCollapsed}
          >
            <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h3 className="text-sm font-semibold text-foreground flex-1">
              {messages.responses.aiWorkflowTitle}
            </h3>
            {aiSectionCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          {!aiSectionCollapsed && (
            <>
              {isLoadingAi ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <p className="text-sm">{messages.responses.aiWorkflowLoading}</p>
                </div>
              ) : !aiActionResults || aiActionResults.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{messages.responses.aiWorkflowEmpty}</p>
              ) : (
                <div className="space-y-4">
                  {aiActionResults.map((result: AiActionResult, index: number) => (
                    <div key={index} className={index > 0 ? 'pt-4 border-t border-border' : ''}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        {result.workflowName}
                      </p>
                      <div className="space-y-3">
                        {Object.entries(result.outputPayload)
                          .filter(([key]) => key !== 'aiOutputJson')
                          .map(([key, value]) => {
                            const schemaLabel = result.outputSchema.find((f) => f.key === key)?.label
                            const resolved = resolveOutputValue(value)

                            if (resolved.kind === 'object') {
                              return (
                                <div key={key} className="space-y-2">
                                  {schemaLabel && (
                                    <p className="text-xs text-muted-foreground">{schemaLabel}</p>
                                  )}
                                  <div className="rounded-md border border-border divide-y divide-border">
                                    {Object.entries(resolved.data).map(([subKey, subValue]) => (
                                      <div key={subKey} className="px-3 py-2">
                                        <p className="text-xs text-muted-foreground mb-0.5">
                                          {camelToLabel(subKey)}
                                        </p>
                                        <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                                          {typeof subValue === 'object' && subValue !== null
                                            ? JSON.stringify(subValue, null, 2)
                                            : String(subValue)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div key={key}>
                                <p className="text-xs text-muted-foreground mb-1">
                                  {schemaLabel ?? camelToLabel(key)}
                                </p>
                                <div className="bg-muted rounded-md px-3 py-2">
                                  <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                                    {resolved.text}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <div className="border-t border-border" />

        {/* Appointment */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {messages.intake.sheetAppointment}
          </h3>
          {response.appointment ? (
            <div className="bg-muted rounded-md p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span className="font-medium">
                  {new Date(response.appointment.startTime).toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                {new Date(response.appointment.startTime).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' – '}
                {new Date(response.appointment.endTime).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="pl-6">
                <Badge variant="secondary" className="text-xs">
                  {APPOINTMENT_STATUS_LABELS[response.appointment.status] ?? response.appointment.status}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {messages.intake.sheetNoAppointment}
            </p>
          )}
        </section>

        <div className="border-t border-border" />

        {/* Internal Notes */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {messages.intake.sheetInternalNotes}
          </h3>
          <Textarea
            value={notesValue}
            onChange={(e) => {
              setNotesValue(e.target.value)
              setNotesSaveState('idle')
              autosaveNotes(e.target.value)
            }}
            placeholder={messages.intake.sheetNotesPlaceholder}
            className="min-h-[80px] resize-y bg-muted border-border"
          />
          <div className="flex items-center mt-2 h-5 text-xs">
            {notesMutation.isPending && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {messages.intake.sheetSavingNotes}
              </span>
            )}
            {notesSaveState === 'saved' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {messages.intake.sheetNotesSaved}
              </span>
            )}
            {notesSaveState === 'error' && (
              <span className="text-destructive">
                {messages.intake.sheetNotesSaveFailed}
              </span>
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Status Change */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {messages.intake.sheetChangeStatus}
          </h3>
          <Select
            value={response.status}
            onValueChange={(value) =>
              statusMutation.mutate({
                responseId: response.id,
                newStatus: value,
              })
            }
            disabled={statusMutation.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusMutation.isPending && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {messages.common.saving}
            </p>
          )}
        </section>

        <div className="border-t border-border" />

        {/* Delete */}
        <section>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {messages.common.delete}
          </Button>
        </section>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.responses.deleteResponseConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {response.hasAppointment
                ? messages.responses.deleteResponseWithAppointmentDescription
                : messages.responses.deleteResponseConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(response.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {messages.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
