import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { History } from 'lucide-react'
import { Badge, Button, Skeleton, cn } from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { getAllExecutionsFn } from '../server'
import type { ExecutionFilters } from '../server'
import { formatDate, getTriggerTypeLabel } from '../utils'
import {
  ACTIVE_EXECUTION_STATUSES,
  EXECUTION_POLL_INTERVAL_MS,
} from '../utils/execution-polling'
import type { ExecutionStatus, ExecutionWithWorkflow, TriggerType } from '../types'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'

// --- Filter chip definitions ---
//
// "Wszystkie" maps to `null` (no status filter sent to server).
// "W toku" intentionally narrows to `running` only — `pending`/`paused` are
// transitional and rarely picked from the dropdown; matching `running` keeps
// the chip semantics tight (user can iterate). Reuses existing
// messages.workflows.executionRunning per duplication rule.

type StatusChipValue = ExecutionStatus | null

interface StatusChip {
  value: StatusChipValue
  label: string
}

const STATUS_CHIPS: readonly StatusChip[] = [
  { value: null, label: messages.workflows.executionHistory.filterAll },
  { value: 'completed', label: messages.workflows.executionHistory.filterCompleted },
  { value: 'running', label: messages.workflows.executionRunning },
  { value: 'failed', label: messages.workflows.executionHistory.filterFailed },
] as const

const ROW_LIMIT = 20

// --- Props ---

interface ExecutionHistoryListViewProps {
  workflowId: string
  /** Polling gate. Parent passes `false` when the panel is closed. */
  pollingEnabled: boolean
  onSelectExecution: (executionId: string) => void
}

// --- Main view ---

export function ExecutionHistoryListView({
  workflowId,
  pollingEnabled,
  onSelectExecution,
}: ExecutionHistoryListViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusChipValue>(null)

  const filters: ExecutionFilters = {
    workflowId,
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const {
    data: executions,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.executions.all(filters),
    queryFn: () =>
      getAllExecutionsFn({
        data: { filters, options: { limit: ROW_LIMIT } },
      }),
    refetchInterval: (query) => {
      if (!pollingEnabled) return false
      const data = query.state.data as ExecutionWithWorkflow[] | undefined
      if (!data) return EXECUTION_POLL_INTERVAL_MS
      const hasActive = data.some((e) => ACTIVE_EXECUTION_STATUSES.includes(e.status))
      return hasActive ? EXECUTION_POLL_INTERVAL_MS : false
    },
  })

  // Polling dot is shown when polling is gated ON and there are active runs
  // currently keeping the refetch interval alive. We derive it from the same
  // signal as `refetchInterval` so the dot can never be stale-on.
  const isPollingActive =
    pollingEnabled &&
    !!executions &&
    (executions as ExecutionWithWorkflow[]).some((e) => ACTIVE_EXECUTION_STATUSES.includes(e.status))

  return (
    <div className="flex h-full flex-col">
      {/* Filter row + polling indicator */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
        <PollingDot active={isPollingActive} fetching={isFetching} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ExecutionListSkeleton />
        ) : error ? (
          <ListErrorState
            message={error instanceof Error ? error.message : messages.common.errorOccurred}
            onRetry={() => refetch()}
          />
        ) : !executions || executions.length === 0 ? (
          <ListEmptyState />
        ) : (
          <ExecutionTable
            executions={executions as ExecutionWithWorkflow[]}
            onSelectExecution={onSelectExecution}
          />
        )}
      </div>

      {/* Footer link to global view (escape hatch beyond 20-row cap) */}
      <div className="border-t border-border px-4 py-2.5">
        <Link
          to={routes.admin.executionsList}
          aria-label={messages.workflows.executionHistory.viewAllInGlobalAriaLabel}
          className="inline-flex items-center text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          {messages.workflows.executionHistory.viewAllInGlobal}
        </Link>
      </div>
    </div>
  )
}

// --- Status filter chips (segmented-control look) ---

interface StatusFilterChipsProps {
  value: StatusChipValue
  onChange: (value: StatusChipValue) => void
}

function StatusFilterChips({ value, onChange }: StatusFilterChipsProps) {
  return (
    <div
      role="group"
      aria-label={messages.workflows.executionHistory.colStatus}
      className="inline-flex items-center gap-1"
    >
      {STATUS_CHIPS.map((chip) => {
        const isActive = chip.value === value
        return (
          <button
            key={chip.value ?? 'all'}
            type="button"
            onClick={() => onChange(chip.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

// --- Polling dot ---

interface PollingDotProps {
  active: boolean
  fetching: boolean
}

function PollingDot({ active, fetching }: PollingDotProps) {
  if (!active && !fetching) return null
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={messages.workflows.executionHistory.pollingActive}
      aria-label={messages.workflows.executionHistory.pollingActive}
      role="status"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full bg-emerald-400',
          active && 'animate-pulse',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{messages.workflows.executionHistory.pollingActive}</span>
    </span>
  )
}

// --- Slim 3-column table ---

interface ExecutionTableProps {
  executions: ExecutionWithWorkflow[]
  onSelectExecution: (executionId: string) => void
}

function ExecutionTable({ executions, onSelectExecution }: ExecutionTableProps) {
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 z-10 bg-card">
        <tr className="border-b border-border">
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
            {messages.workflows.executionHistory.colStatus}
          </th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
            {messages.workflows.executionHistory.colStartedAt}
          </th>
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
            {messages.workflows.executionHistory.colTrigger}
          </th>
        </tr>
      </thead>
      <tbody>
        {executions.map((execution) => (
          <ExecutionRow
            key={execution.id}
            execution={execution}
            onClick={() => onSelectExecution(execution.id)}
          />
        ))}
      </tbody>
    </table>
  )
}

// --- Row (clickable, keyboard-accessible) ---

interface ExecutionRowProps {
  execution: ExecutionWithWorkflow
  onClick: () => void
}

function ExecutionRow({ execution, onClick }: ExecutionRowProps) {
  return (
    <tr
      className="cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-muted/40 focus-within:bg-muted/40"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <td className="px-4 py-2 align-middle">
        <ExecutionStatusBadge status={execution.status} />
      </td>
      <td
        className="px-3 py-2 align-middle text-muted-foreground whitespace-nowrap"
        title={execution.started_at ?? undefined}
      >
        {formatDate(execution.started_at)}
      </td>
      <td className="px-3 py-2 align-middle">
        <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
          {getTriggerTypeLabel(execution.workflow_trigger_type as TriggerType)}
        </Badge>
      </td>
    </tr>
  )
}

// --- Loading skeleton ---

function ExecutionListSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// --- Empty state (slim — no full hero) ---

function ListEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <History className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        {messages.workflows.noExecutions}
      </p>
      <p className="text-xs text-muted-foreground">
        {messages.workflows.noExecutionsDescription}
      </p>
    </div>
  )
}

// --- Error state (slim banner) ---

interface ListErrorStateProps {
  message: string
  onRetry: () => void
}

function ListErrorState({ message, onRetry }: ListErrorStateProps) {
  return (
    <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
      <p className="text-xs font-medium text-destructive">
        {messages.workflows.executionHistory.loadFailed}
      </p>
      <p className="mt-1 text-xs text-destructive/80">{message}</p>
      <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={onRetry}>
        {messages.workflows.retryButton}
      </Button>
    </div>
  )
}
