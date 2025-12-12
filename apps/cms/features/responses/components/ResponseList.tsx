'use client'

import { useQuery } from '@tanstack/react-query'
import { getResponses } from '../queries'
import { Button, Card } from '@legal-mind/ui'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, AlertCircle, FileText } from 'lucide-react'
import type { ResponseListItem, ResponseStatus } from '../types'

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
      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-200">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="col-span-5 text-sm font-semibold text-gray-900">Survey</div>
            <div className="col-span-3 text-sm font-semibold text-gray-900">Submitted</div>
            <div className="col-span-2 text-sm font-semibold text-gray-900">Status</div>
            <div className="col-span-2 text-sm font-semibold text-gray-900">Actions</div>
          </div>

          {/* Skeleton Rows */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50"
            >
              <div className="col-span-5 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-3 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-2 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-2 bg-gray-200 h-4 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // ERROR STATE: Show error with retry button
  if (error) {
    return (
      <Card className="bg-red-50 border-red-200 p-6">
        <div className="flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Failed to load responses</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex-shrink-0"
          >
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  // EMPTY STATE: No responses
  if (!responses || responses.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No responses yet</h3>
        <p className="text-gray-600">
          Create a survey and share the link to start collecting responses.
        </p>
      </Card>
    )
  }

  // SUCCESS STATE: Render table
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="divide-y divide-gray-200">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="col-span-5 text-sm font-semibold text-gray-900">Survey</div>
              <div className="col-span-3 text-sm font-semibold text-gray-900">Submitted</div>
              <div className="col-span-2 text-sm font-semibold text-gray-900">Status</div>
              <div className="col-span-2 text-sm font-semibold text-gray-900">Actions</div>
            </div>

            {/* Table Rows */}
            {responses.map((response) => (
              <ResponseRow
                key={response.id}
                response={response}
                onRowClick={() => router.push(`/admin/responses/${response.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          Showing {responses.length} {responses.length === 1 ? 'response' : 'responses'}
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
  onRowClick
}: {
  response: ResponseListItem
  onRowClick: () => void
}) {
  // Get status badge color
  const getStatusColor = (status: ResponseStatus | null) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'disqualified':
        return 'bg-red-100 text-red-800'
      case 'contacted':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Format date: "Dec 12, 2025 10:30 AM"
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Invalid date'
    }
  }

  // Get survey title with fallback
  const surveyTitle = response.surveys?.title || 'Unknown Survey'

  // Truncate long survey titles
  const truncatedTitle =
    surveyTitle.length > 50 ? `${surveyTitle.substring(0, 47)}...` : surveyTitle

  return (
    <div
      onClick={onRowClick}
      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* Survey Title Column (40%) */}
      <div className="col-span-5">
        <p className="text-sm font-medium text-gray-900 truncate" title={surveyTitle}>
          {truncatedTitle}
        </p>
      </div>

      {/* Submitted Date Column (30%) */}
      <div className="col-span-3">
        <p className="text-sm text-gray-600">{formatDate(response.created_at)}</p>
      </div>

      {/* Status Column (20%) */}
      <div className="col-span-2">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            response.status
          )}`}
        >
          {response.status || 'unknown'}
        </span>
      </div>

      {/* Actions Column (10%) */}
      <div className="col-span-2 flex items-center justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRowClick()
          }}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="View response details"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
