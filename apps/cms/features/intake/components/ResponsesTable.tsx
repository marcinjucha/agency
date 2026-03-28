'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  Badge,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { ArrowRight, FileText } from 'lucide-react'
import { getResponseStatusColor } from '@/lib/utils/status'
import { messages } from '@/lib/messages'
import { RESPONSE_STATUSES } from '../validation'
import type { PipelineResponse, ResponseStatus } from '../types'

interface ResponsesTableProps {
  responses: PipelineResponse[]
  onSelectResponse: (response: PipelineResponse) => void
}

/** Status labels for display */
const STATUS_LABELS: Record<ResponseStatus, string> = {
  new: messages.intake.columnNew,
  qualified: messages.intake.columnQualified,
  contacted: messages.intake.columnContacted,
  disqualified: messages.intake.badgeDisqualified,
  client: messages.intake.badgeClient,
  rejected: messages.intake.badgeRejected,
}

/** "All" sentinel value for Select — Radix Select does not support empty string */
const ALL_VALUE = '__all__'

/**
 * AI score color based on the same green/amber/red scheme used in PipelineCard.
 * 8-10 = green (hot), 5-7 = amber (warm), 0-4 = red (cold)
 */
function getAiScoreColor(score: number): string {
  if (score >= 8) return 'text-status-success-foreground'
  if (score >= 5) return 'text-status-warning-foreground'
  return 'text-status-error-foreground'
}

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
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
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
                        <span className={`text-sm font-medium ${getAiScoreColor(response.aiScore)}`}>
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
    </div>
  )
}
