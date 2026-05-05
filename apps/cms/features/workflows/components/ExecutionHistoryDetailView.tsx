import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronUp, Copy, History, RotateCcw } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Skeleton,
  cn,
} from '@agency/ui'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { usePermissions } from '@/contexts/permissions-context'
import { getExecutionWithStepsFn, retryWorkflowExecutionFn } from '../server'
import {
  EXECUTION_POLL_INTERVAL_MS,
  TERMINAL_EXECUTION_STATUSES,
} from '../utils/execution-polling'
import type { ExecutionWithSteps } from '../types'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import { StepExecutionTimeline } from './StepExecutionTimeline'

const COPY_FEEDBACK_MS = 1500

// --- Props ---

interface ExecutionHistoryDetailViewProps {
  executionId: string
  /** Polling gate. Parent passes `false` when the panel is closed. */
  pollingEnabled: boolean
  onBack: () => void
  /** Bidirectional callback — wired in Iter 4 to TestModePanel.initialJson. */
  onCopyPayloadToTest: (payload: Record<string, unknown>) => void
}

// --- Main view ---

export function ExecutionHistoryDetailView({
  executionId,
  pollingEnabled,
  onBack,
  onCopyPayloadToTest,
}: ExecutionHistoryDetailViewProps) {
  const { hasPermission } = usePermissions()
  const canRetry = hasPermission('workflows.execute')
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [didCopyPayload, setDidCopyPayload] = useState(false)

  const {
    data: execution,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.executions.detail(executionId),
    queryFn: () => getExecutionWithStepsFn({ data: { executionId } }),
    refetchInterval: (query) => {
      if (!pollingEnabled) return false
      const data = query.state.data as ExecutionWithSteps | null | undefined
      if (!data) return EXECUTION_POLL_INTERVAL_MS
      return TERMINAL_EXECUTION_STATUSES.includes(data.status) ? false : EXECUTION_POLL_INTERVAL_MS
    },
  })

  // Reset transient "Skopiowano" feedback after 1.5s. This is the one place
  // a `useState` is justified per SESSION.md — React 19 Compiler does NOT
  // remove this state.
  useEffect(() => {
    if (!didCopyPayload) return
    const timer = setTimeout(() => setDidCopyPayload(false), COPY_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [didCopyPayload])

  const handleRetry = async () => {
    if (isRetrying) return
    setIsRetrying(true)
    setRetryError(null)
    try {
      const result = await retryWorkflowExecutionFn({ data: { executionId } })
      if (result.ok || result.error === 'conflict') {
        await refetch()
      } else {
        setRetryError(result.message ?? result.error)
      }
    } catch {
      setRetryError(messages.common.errorOccurred)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCopyPayload = (payload: Record<string, unknown>) => {
    onCopyPayloadToTest(payload)
    setDidCopyPayload(true)
  }

  return (
    <div className="flex h-full flex-col">
      <DetailHeader
        execution={execution}
        canRetry={canRetry}
        isRetrying={isRetrying}
        onBack={onBack}
        onRetry={handleRetry}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <DetailSkeleton />
        ) : error ? (
          <DetailErrorState
            message={error instanceof Error ? error.message : messages.common.errorOccurred}
            onRetry={() => refetch()}
          />
        ) : !execution ? (
          <DetailNotFoundState />
        ) : (
          <div className="space-y-4 p-4">
            <MiniStatusCard
              execution={execution}
              didCopy={didCopyPayload}
              onCopyPayload={handleCopyPayload}
            />

            {retryError && (
              <p className="text-xs text-destructive" role="alert">
                {messages.workflows.retryButton}: {retryError}
              </p>
            )}

            <TriggerPayloadBlock payload={execution.trigger_payload} />

            <StepExecutionTimeline
              stepExecutions={execution.step_executions}
              snapshot={execution.workflow_snapshot}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// --- Sticky header (back + retry + close) ---

interface DetailHeaderProps {
  execution: ExecutionWithSteps | null | undefined
  canRetry: boolean
  isRetrying: boolean
  onBack: () => void
  onRetry: () => void
}

function DetailHeader({
  execution,
  canRetry,
  isRetrying,
  onBack,
  onRetry,
}: DetailHeaderProps) {
  const status = execution?.status
  const showRetryButton =
    canRetry && (status === 'failed' || status === 'cancelled' || status === 'running')
  const retryDisabled = status === 'running' || isRetrying

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={onBack}
        aria-label={messages.workflows.executionHistory.detailBack}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span className="ml-1.5 text-xs">{messages.workflows.executionHistory.detailBack}</span>
      </Button>

      <div className="flex items-center gap-1">
        {showRetryButton && status !== 'running' ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={isRetrying}
              >
                <RotateCcw
                  className={cn('mr-1.5 h-3.5 w-3.5', isRetrying && 'animate-spin')}
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
                <AlertDialogAction onClick={onRetry}>
                  {messages.workflows.retryButton}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : showRetryButton ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={retryDisabled}
            title={messages.workflows.retryDisabledRunning}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {messages.workflows.retryButton}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// --- Mini status card (status + ID + copy payload button) ---

interface MiniStatusCardProps {
  execution: ExecutionWithSteps
  didCopy: boolean
  onCopyPayload: (payload: Record<string, unknown>) => void
}

function MiniStatusCard({ execution, didCopy, onCopyPayload }: MiniStatusCardProps) {
  const payload = execution.trigger_payload
  const hasPayload = !!payload && Object.keys(payload).length > 0

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <ExecutionStatusBadge status={execution.status} />
      </div>

      <div className="mt-2.5 space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {messages.workflows.executionHistory.detailExecutionId}
        </p>
        <p
          className="truncate font-mono text-xs text-foreground"
          title={execution.id}
        >
          {execution.id}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 h-8 w-full text-xs"
        disabled={!hasPayload}
        onClick={() => hasPayload && onCopyPayload(payload)}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {didCopy
          ? messages.workflows.executionHistory.detailPayloadCopied
          : messages.workflows.executionHistory.detailCopyPayload}
      </Button>
    </div>
  )
}

// --- Trigger payload preview block ---
//
// DUPLICATED inline from ExecutionDetail.tsx per SESSION.md ("do NOT extract —
// out of scope"). Drift target: if either copy is updated, audit the other.

function TriggerPayloadBlock({ payload }: { payload: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const isEmpty = Object.keys(payload).length === 0

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          {messages.workflows.executionTriggerPayload}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          {messages.workflows.stepNoPayload}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
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
              aria-label={
                open
                  ? messages.workflows.stepPayloadCollapse
                  : messages.workflows.stepPayloadExpand
              }
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

// --- Loading skeleton ---

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-hidden="true">
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  )
}

// --- Error state ---

interface DetailErrorStateProps {
  message: string
  onRetry: () => void
}

function DetailErrorState({ message, onRetry }: DetailErrorStateProps) {
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

// --- Not-found state ---

function DetailNotFoundState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <History className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">
        {messages.workflows.executionNotFound}
      </p>
    </div>
  )
}
