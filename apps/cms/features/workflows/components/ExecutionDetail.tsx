

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLink, ArrowLeft, ChevronDown, ChevronUp, History, RotateCcw } from 'lucide-react'
import { cn } from '@agency/ui'
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  ErrorState,
  EmptyState,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { usePermissions } from '@/contexts/permissions-context'
import { getExecutionWithStepsFn, retryWorkflowExecutionFn } from '../server'
import { formatDate, formatExecutionDuration } from '../utils'
import type { ExecutionWithSteps, ExecutionStatus } from '../types'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import { StepExecutionTimeline } from './StepExecutionTimeline'

// --- Terminal statuses — polling stops when reached ---

const TERMINAL_STATUSES: ExecutionStatus[] = ['completed', 'failed', 'cancelled']

// --- Skeleton shown while loading ---

function ExecutionDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Back + action bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Title */}
      <Skeleton className="h-7 w-64" />

      {/* Header card */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Step skeletons */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// --- Trigger payload collapsible ---

function TriggerPayloadBlock({ payload }: { payload: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const isEmpty = Object.keys(payload).length === 0

  if (isEmpty) {
    return (
      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="text-xs font-medium text-muted-foreground">
          {messages.workflows.executionTriggerPayload}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">{messages.workflows.stepNoPayload}</p>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {messages.workflows.executionTriggerPayload}
          </p>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label={open ? messages.workflows.stepPayloadCollapse : messages.workflows.stepPayloadExpand}
            >
              {open ? (
                <>
                  {messages.workflows.stepPayloadCollapse}
                  <ChevronUp className="ml-1 h-3 w-3" aria-hidden="true" />
                </>
              ) : (
                <>
                  {messages.workflows.stepPayloadExpand}
                  <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <pre className="mt-1.5 max-h-48 overflow-x-auto overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-xs text-foreground">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// --- Header card showing execution metadata ---

function ExecutionHeaderCard({ execution }: { execution: ExecutionWithSteps }) {
  return (
    <Card>
      <CardContent className="pt-6">
        {/* Status + workflow row */}
        <div className="flex flex-wrap items-center gap-3">
          <ExecutionStatusBadge status={execution.status} />
          <span className="text-sm text-muted-foreground">
            {messages.workflows.executionWorkflow}:{' '}
            <span className="font-medium text-foreground">{execution.workflow_name}</span>
          </span>
        </div>

        {/* Timestamps grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{messages.workflows.executionDetailStarted}</p>
            <p className="mt-0.5 text-sm text-foreground">{formatDate(execution.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{messages.workflows.executionDetailCompleted}</p>
            <p className="mt-0.5 text-sm text-foreground">{formatDate(execution.completed_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{messages.workflows.executionDetailDuration}</p>
            <p className="mt-0.5 text-sm text-foreground">
              {formatExecutionDuration(execution.created_at, execution.completed_at)}
            </p>
          </div>
        </div>

        {/* Error block */}
        {execution.error_message && (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm font-medium text-red-400">
              {messages.workflows.executionDetailError}
            </p>
            <p className="mt-1 font-mono text-xs text-red-400/80">{execution.error_message}</p>
          </div>
        )}

        {/* Trigger payload */}
        <TriggerPayloadBlock payload={execution.trigger_payload} />
      </CardContent>
    </Card>
  )
}

// --- Props ---

interface ExecutionDetailProps {
  executionId: string
  initialData?: ExecutionWithSteps
}

// --- Main export ---

export function ExecutionDetail({ executionId, initialData }: ExecutionDetailProps) {
  const { hasPermission } = usePermissions()
  const canRetry = hasPermission('workflows.execute')
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  const {
    data: execution,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.executions.detail(executionId),
    queryFn: () => getExecutionWithStepsFn({ data: { executionId } }),
    initialData: initialData ?? undefined,
    refetchInterval: (query) => {
      const data = query.state.data as ExecutionWithSteps | null | undefined
      if (!data) return 10_000
      return TERMINAL_STATUSES.includes(data.status) ? false : 10_000
    },
  })

  const handleRetry = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    setRetryError(null)
    try {
      const result = await retryWorkflowExecutionFn({ data: { executionId } })
      if (result.ok) {
        await refetch()
      } else if (result.error === 'conflict') {
        // Already running — refetch to surface current running status.
        await refetch()
      } else {
        // Infrastructure / auth failure — optimistic lock has been reversed
        // server-side, so the execution stays retriable.
        setRetryError(result.message ?? result.error)
      }
    } catch {
      // Network error (offline, CORS) — RPC itself rejected.
      setRetryError(messages.common.errorOccurred)
    } finally {
      setIsRetrying(false)
    }
  }

  if (isLoading && !initialData) return <ExecutionDetailSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.workflows.executionDetailTitle}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
      />
    )
  }

  if (!execution) {
    return (
      <EmptyState
        icon={History}
        title={messages.workflows.executionNotFound}
        description={messages.workflows.backToExecutions}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to={routes.admin.executionsList}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {messages.workflows.backToExecutions}
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Back navigation + open in editor */}
      <div className="flex items-center justify-between">
        <Link
          to={routes.admin.executionsList}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={messages.workflows.backToExecutions}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {messages.workflows.backToExecutions}
        </Link>

        <div className="flex items-center gap-2">
          {canRetry && (
            <>
              {execution.status === 'failed' || execution.status === 'cancelled' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isRetrying}>
                      <RotateCcw
                        className={cn('mr-2 h-4 w-4', isRetrying && 'animate-spin')}
                        aria-hidden="true"
                      />
                      {messages.workflows.retryButton}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{messages.workflows.retryConfirmTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {messages.workflows.retryConfirmDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRetry}>
                        {messages.workflows.retryButton}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : execution.status === 'running' ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title={messages.workflows.retryDisabledRunning}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  {messages.workflows.retryButton}
                </Button>
              ) : null}
            </>
          )}

          <Button asChild variant="outline" size="sm">
            <Link to={routes.admin.workflowEditor(execution.workflow_id)}>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              {messages.workflows.openInEditor}
            </Link>
          </Button>
        </div>
      </div>

      {retryError && (
        <p
          className="text-xs text-destructive"
          role="alert"
        >
          {messages.workflows.retryButton}: {retryError}
        </p>
      )}

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {messages.workflows.executionDetailTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{execution.workflow_name}</p>
      </div>

      {/* Header metadata card */}
      <ExecutionHeaderCard execution={execution} />

      {/* Step timeline */}
      <StepExecutionTimeline
        stepExecutions={execution.step_executions}
        snapshot={execution.workflow_snapshot}
      />
    </div>
  )
}
