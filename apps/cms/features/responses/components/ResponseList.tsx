'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getResponses } from '../queries'
import { deleteResponse } from '../actions'
import {
  Card, LoadingState, ErrorState, EmptyState,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileText, Trash2 } from 'lucide-react'
import type { ResponseListItem, ResponseStatus } from '../types'
import { getResponseStatusColor } from '@/lib/utils/status'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

/**
 * ResponseList Component
 *
 * Displays all responses in a sortable table with:
 * - Survey title column (40%)
 * - Submission date column (30%)
 * - Status badge column (20%)
 * - Actions column (10%)
 *
 * Features:
 * - TanStack Query integration with 5-second auto-refresh
 * - Click row to navigate to detail view
 * - Loading state with skeleton rows
 * - Error state with retry button
 * - Empty state with helpful message
 * - Responsive table design
 *
 * @component
 * @returns Responses table component
 */
export function ResponseList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteResponse(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
  const {
    data: responses,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['responses'],
    queryFn: getResponses,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 0 // Data is always considered stale
  })

  // LOADING STATE: Skeleton rows
  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingState variant="skeleton-table" rows={5} />
      </Card>
    )
  }

  // ERROR STATE: Show error with retry button
  if (error) {
    return (
      <ErrorState
        title={messages.responses.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  // EMPTY STATE: No responses
  if (!responses || responses.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={messages.responses.noResponses}
        description={messages.responses.noResponsesDescription}
        variant="card"
      />
    )
  }

  // SUCCESS STATE: Render table
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Responses list">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                {messages.responses.surveyColumn}
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                {messages.responses.submittedColumn}
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                {messages.responses.statusColumn}
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                {messages.responses.actionsColumn}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Table Rows */}
            {responses.map((response) => (
              <ResponseRow
                key={response.id}
                response={response}
                onRowClick={() => router.push(routes.admin.response(response.id))}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {messages.responses.responsesLoaded(responses.length)}
      </div>

      {/* Footer with count */}
      <div className="px-6 py-3 bg-muted border-t border-border">
        <p className="text-xs text-muted-foreground">
          {messages.responses.showingResponses(responses.length)}
        </p>
      </div>
    </Card>
  )
}

/**
 * ResponseRow Component
 *
 * Individual row in the responses table
 *
 * @component
 * @param response - Response list item to display
 * @param onRowClick - Callback when row is clicked
 */
function ResponseRow({
  response,
  onRowClick,
  onDelete,
}: {
  response: ResponseListItem
  onRowClick: () => void
  onDelete: (id: string) => void
}) {
  // Format date: "Dec 12, 2025 10:30 AM"
  const formatDate = (dateString: string | null) => {
    if (!dateString) return messages.responses.unknownDate
    try {
      const date = new Date(dateString)
      return date.toLocaleString('pl-PL', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return messages.responses.invalidDate
    }
  }

  // Get survey title with fallback
  const surveyTitle = response.surveys?.title || messages.responses.unknownSurvey

  // Truncate long survey titles
  const truncatedTitle =
    surveyTitle.length > 50 ? `${surveyTitle.substring(0, 47)}...` : surveyTitle

  return (
    <tr
      onClick={onRowClick}
      className="hover:bg-muted cursor-pointer transition-colors"
    >
      {/* Survey Title Column */}
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-foreground truncate" title={surveyTitle}>
          {truncatedTitle}
        </p>
      </td>

      {/* Submitted Date Column */}
      <td className="px-6 py-4">
        <p className="text-sm text-muted-foreground">{formatDate(response.created_at)}</p>
      </td>

      {/* Status Column */}
      <td className="px-6 py-4">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getResponseStatusColor(
            response.status
          )}`}
        >
          {response.status || messages.responses.unknown}
        </span>
      </td>

      {/* Actions Column */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-3 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                aria-label="Usuń"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => onDelete(response.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {messages.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRowClick()
            }}
            className="p-3 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            aria-label={messages.responses.viewDetails}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
