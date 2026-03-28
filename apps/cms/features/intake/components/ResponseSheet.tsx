'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Badge,
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { ExternalLink, Calendar, CheckCircle2, Loader2 } from 'lucide-react'
import { updateResponseStatus, updateInternalNotes } from '../actions'
import { getResponseStatusColor } from '@/lib/utils/status'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { RESPONSE_STATUSES } from '../validation'
import type { PipelineResponse, ResponseStatus } from '../types'
import type { Question, SurveyAnswers } from '../../responses/types'

interface ResponseSheetProps {
  response: PipelineResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Status labels for the status selector */
const STATUS_LABELS: Record<ResponseStatus, string> = {
  new: messages.intake.columnNew,
  qualified: messages.intake.columnQualified,
  contacted: messages.intake.columnContacted,
  disqualified: messages.intake.badgeDisqualified,
  client: messages.intake.badgeClient,
  rejected: messages.intake.badgeRejected,
}

/** AI recommendation badge styling */
function getRecommendationStyle(rec: string): string {
  switch (rec) {
    case 'QUALIFIED':
      return 'bg-emerald-500/15 text-emerald-400'
    case 'DISQUALIFIED':
      return 'bg-red-500/15 text-red-400'
    case 'NEEDS_MORE_INFO':
      return 'bg-amber-500/15 text-amber-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/** AI score color: green 8-10, amber 5-7, red 0-4 */
function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
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

export function ResponseSheet({ response, open, onOpenChange }: ResponseSheetProps) {
  const queryClient = useQueryClient()
  const [notesValue, setNotesValue] = useState('')
  const [notesSaveState, setNotesSaveState] = useState<'idle' | 'saved' | 'error'>('idle')

  // Sync local notes with selected response
  useEffect(() => {
    if (response) {
      setNotesValue(response.internalNotes ?? '')
      setNotesSaveState('idle')
    }
  }, [response?.id, response?.internalNotes])

  const notesMutation = useMutation({
    mutationFn: async ({ responseId, notes }: { responseId: string; notes: string }) => {
      const result = await updateInternalNotes(responseId, notes)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake', 'pipeline'] })
      setNotesSaveState('saved')
      setTimeout(() => setNotesSaveState('idle'), 2000)
    },
    onError: () => {
      setNotesSaveState('error')
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ responseId, newStatus }: { responseId: string; newStatus: string }) => {
      const result = await updateResponseStatus(responseId, newStatus)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake', 'pipeline'] })
    },
  })

  if (!response) return null

  const qaPairs = buildQuestionAnswerPairs(response.surveyQuestions, response.answers)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-semibold truncate">
                {response.clientName}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {response.surveyTitle}
              </SheetDescription>
            </div>
            <Badge
              className={`${getResponseStatusColor(response.status)} px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0`}
            >
              {STATUS_LABELS[response.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDate(response.createdAt)}
          </p>
        </SheetHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Divider */}
          <div className="border-t border-border" />

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

          {/* Divider */}
          <div className="border-t border-border" />

          {/* AI Qualification */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {messages.intake.sheetAiAnalysis}
            </h3>
            {response.aiScore !== null ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {response.aiRecommendation && (
                    <Badge
                      className={`${getRecommendationStyle(response.aiRecommendation)} px-2.5 py-0.5 rounded-full text-xs font-medium`}
                    >
                      {response.aiRecommendation}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {messages.responses.overall}:{' '}
                    <strong className={getScoreColor(response.aiScore)}>
                      {response.aiScore}/10
                    </strong>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {messages.intake.sheetOpenFullPage} — {messages.responses.aiAnalysis}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {messages.responses.analysisUnavailable}
              </p>
            )}
          </section>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Appointment */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {messages.intake.sheetAppointment}
            </h3>
            {response.hasAppointment ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>{messages.intake.sheetAppointment}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {messages.intake.sheetNoAppointment}
              </p>
            )}
          </section>

          {/* Divider */}
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
              }}
              placeholder={messages.intake.sheetNotesPlaceholder}
              className="min-h-[80px] resize-y bg-muted border-border"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs">
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
              <Button
                variant="outline"
                size="sm"
                disabled={notesMutation.isPending || notesValue === (response.internalNotes ?? '')}
                onClick={() =>
                  notesMutation.mutate({
                    responseId: response.id,
                    notes: notesValue,
                  })
                }
              >
                {notesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    {messages.intake.sheetSavingNotes}
                  </>
                ) : (
                  messages.intake.sheetSaveNotes
                )}
              </Button>
            </div>
          </section>

          {/* Divider */}
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
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-border">
          <Link
            href={routes.admin.response(response.id)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {messages.intake.sheetOpenFullPage}
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
