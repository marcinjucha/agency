'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Badge,
  EmptyState,
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
import { ArrowRight, FileText, Trash2 } from 'lucide-react'
import { getResponseStatusColor } from '@/lib/utils/status'
import { messages } from '@/lib/messages'
import { RESPONSE_STATUSES } from '../validation'
import { deleteResponse } from '../../responses/actions'
import { queryKeys } from '@/lib/query-keys'
import { STATUS_LABELS, getAiScoreTextColor } from '../types'
import type { PipelineResponse } from '../types'

interface ResponsesTableProps {
  responses: PipelineResponse[]
  onSelectResponse: (response: PipelineResponse) => void
}

/** "All" sentinel value for Select — Radix Select does not support empty string */
const ALL_VALUE = '__all__'

/** Format date to pl-PL locale */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return messages.responses.invalidDate
  }
}

export function ResponsesTable({ responses, onSelectResponse }: ResponsesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<PipelineResponse | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteResponse(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.intake.all })
      setDeleteTarget(null)
    },
  })

  const statusFilter = searchParams.get('status') ?? ''
  const surveyFilter = searchParams.get('survey') ?? ''

  /** Unique survey titles derived from data */
  const uniqueSurveys = useMemo(() => {
    const titles = new Set<string>()
    for (const r of responses) {
      if (r.surveyTitle) titles.add(r.surveyTitle)
    }
    return Array.from(titles).sort()
  }, [responses])

  /** Client-side filtering */
  const filtered = useMemo(() => {
    return responses.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false
      if (surveyFilter && r.surveyTitle !== surveyFilter) return false
      return true
    })
  }, [responses, statusFilter, surveyFilter])

  /** Update URL searchParams without full page reload */
  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter || ALL_VALUE}
          onValueChange={(v) => setFilter('status', v === ALL_VALUE ? '' : v)}
        >
          <SelectTrigger className="w-[180px]" aria-label={messages.intake.tableFilterStatus}>
            <SelectValue placeholder={messages.intake.tableAllStatuses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              {messages.intake.tableAllStatuses}
            </SelectItem>
            {RESPONSE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={surveyFilter || ALL_VALUE}
          onValueChange={(v) => setFilter('survey', v === ALL_VALUE ? '' : v)}
        >
          <SelectTrigger className="w-[220px]" aria-label={messages.intake.tableFilterSurvey}>
            <SelectValue placeholder={messages.intake.tableAllSurveys} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              {messages.intake.tableAllSurveys}
            </SelectItem>
            {uniqueSurveys.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={messages.intake.tableNoResults}
          description={messages.intake.tableNoResultsDescription}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label={messages.intake.tabResponses}>
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    {messages.intake.tableFilterClient}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    {messages.intake.tableFilterSurvey}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    {messages.intake.tableFilterStatus}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    {messages.intake.tableFilterAiScore}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    {messages.intake.tableFilterDate}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                    {messages.intake.tableActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((response) => (
                  <tr
                    key={response.id}
                    onClick={() => onSelectResponse(response)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {/* Client Name */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {response.clientName}
                      </span>
                    </td>

                    {/* Survey */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {response.surveyTitle}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge
                        className={`${getResponseStatusColor(response.status)} border-0`}
                      >
                        {STATUS_LABELS[response.status]}
                      </Badge>
                    </td>

                    {/* AI Score */}
                    <td className="px-6 py-4">
                      {response.aiScore !== null ? (
                        <span className={`text-sm font-medium ${getAiScoreTextColor(response.aiScore)}`}>
                          {response.aiScore}/10
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(response.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectResponse(response)
                          }}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                          aria-label={messages.responses.viewDetails}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(response)
                          }}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                          aria-label={messages.common.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with count */}
          <div className="px-6 py-3 bg-muted border-t border-border">
            <p className="text-xs text-muted-foreground">
              {messages.intake.tableShowingResults(filtered.length)}
            </p>
          </div>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.responses.deleteResponseConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.hasAppointment
                ? messages.responses.deleteResponseWithAppointmentDescription
                : messages.responses.deleteResponseConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
