

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { History } from 'lucide-react'
import { Skeleton, ErrorState, EmptyState } from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { getAllExecutions, getWorkflows } from '../queries'
import { getTriggerTypeLabel, formatDate, formatExecutionDuration } from '../utils'
import type { ExecutionStatus, ExecutionWithWorkflow, TriggerType } from '../types'
import type { ExecutionFilters } from '../queries'
import { Badge } from '@agency/ui'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import { ExecutionFilters as ExecutionFiltersBar } from './ExecutionFilters'

// --- Props ---

interface ExecutionListProps {
  workflowId?: string
}

// --- Main component ---

export function ExecutionList({ workflowId: propWorkflowId }: ExecutionListProps) {
  const router = useRouter()
  const isGlobalView = propWorkflowId === undefined

  const [filterWorkflowId, setFilterWorkflowId] = useState<string | undefined>(
    propWorkflowId
  )
  const [filterStatus, setFilterStatus] = useState<ExecutionStatus | undefined>(undefined)

  const filters: ExecutionFilters = {
    ...(filterWorkflowId ? { workflowId: filterWorkflowId } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
  }

  const {
    data: executions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.executions.all(filters),
    queryFn: () => getAllExecutions(Object.keys(filters).length ? filters : undefined),
    refetchInterval: (query) => {
      const data = query.state.data as ExecutionWithWorkflow[] | undefined
      if (!data) return 10_000
      const hasActive = data.some((e) =>
        (['pending', 'running', 'paused'] as ExecutionStatus[]).includes(e.status)
      )
      return hasActive ? 10_000 : false
    },
  })

  const {
    data: workflows,
    isLoading: workflowsLoading,
  } = useQuery({
    queryKey: queryKeys.workflows.list,
    queryFn: getWorkflows,
    enabled: isGlobalView,
  })

  if (isLoading) return <ExecutionListSkeleton showWorkflowCol={isGlobalView} />

  if (error) {
    return (
      <ErrorState
        title={messages.workflows.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  const workflowOptions = (workflows || []).map((wf) => ({ id: wf.id, name: wf.name }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {messages.workflows.executionsTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.workflows.executionsPageDescription}
          </p>
        </div>
        {isGlobalView && !workflowsLoading && (
          <ExecutionFiltersBar
            workflowId={filterWorkflowId}
            status={filterStatus}
            onWorkflowIdChange={setFilterWorkflowId}
            onStatusChange={setFilterStatus}
            workflows={workflowOptions}
          />
        )}
      </div>

      {/* Empty state */}
      {(!executions || executions.length === 0) ? (
        <EmptyState
          icon={History}
          title={messages.workflows.noExecutions}
          description={messages.workflows.noExecutionsDescription}
          variant="card"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {isGlobalView && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {messages.workflows.executionsColWorkflow}
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.executionsColStatus}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.executionsColTrigger}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.executionsColStarted}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.executionsColCompleted}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.executionsColDuration}
                </th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <ExecutionRow
                  key={execution.id}
                  execution={execution}
                  showWorkflowCol={isGlobalView}
                  onClick={() => router.push(routes.admin.execution(execution.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Row ---

interface ExecutionRowProps {
  execution: ExecutionWithWorkflow
  showWorkflowCol: boolean
  onClick: () => void
}

function ExecutionRow({ execution, showWorkflowCol, onClick }: ExecutionRowProps) {
  return (
    <tr
      className="border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50"
      role="link"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {showWorkflowCol && (
        <td className="px-4 py-3">
          <Link
            href={routes.admin.workflowEditor(execution.workflow_id)}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-foreground hover:underline"
          >
            {execution.workflow_name || '\u2013'}
          </Link>
        </td>
      )}
      <td className="px-4 py-3">
        <ExecutionStatusBadge status={execution.status} />
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs font-normal">
          {getTriggerTypeLabel(execution.workflow_trigger_type as TriggerType)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(execution.started_at)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {execution.completed_at ? formatDate(execution.completed_at) : '\u2013'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatExecutionDuration(execution.started_at, execution.completed_at)}
      </td>
    </tr>
  )
}

// --- Skeleton ---

function ExecutionListSkeleton({ showWorkflowCol }: { showWorkflowCol: boolean }) {
  const colCount = showWorkflowCol ? 6 : 5
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        {showWorkflowCol && (
          <div className="flex gap-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-48" />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-3">
          {Array.from({ length: colCount }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            {showWorkflowCol && <Skeleton className="h-4 w-36" />}
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
