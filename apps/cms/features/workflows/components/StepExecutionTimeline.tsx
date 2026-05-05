
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Clock, Copy } from 'lucide-react'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@agency/ui'
import { cn } from '@agency/ui'
import { messages } from '@/lib/messages'
import { formatDate, formatExecutionDuration } from '../utils'
import { STEP_TYPE_LABELS, STEP_EXECUTION_STATUS_LABELS } from '../types'
import type { StepExecutionWithMeta, StepExecutionStatus, WorkflowSnapshot } from '../types'
import { groupAttemptsByStep } from '../utils/group-attempts'
import type { StepAttemptGroup } from '../utils/group-attempts'

// --- Step status → left border color ---

const STEP_BORDER_CLASSES: Record<StepExecutionStatus, string> = {
  completed:  'border-l-emerald-500',
  running:    'border-l-blue-500',
  failed:     'border-l-red-500',
  skipped:    'border-l-border',
  waiting:    'border-l-amber-500',
  processing: 'border-l-amber-500',
  pending:    'border-l-border',
  cancelled:  'border-l-zinc-500',
}

// --- Step status badge colors (inline, text-xs) ---

const STEP_STATUS_BADGE_CLASSES: Record<StepExecutionStatus, string> = {
  completed:  'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  running:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
  failed:     'border-red-500/30 bg-red-500/10 text-red-400',
  skipped:    'border-border bg-muted/50 text-muted-foreground',
  waiting:    'border-amber-500/30 bg-amber-500/10 text-amber-400',
  processing: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  pending:    'border-border bg-muted/50 text-muted-foreground',
  cancelled:  'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
}

// --- JSON payload block (plain — collapse handled by parent StepCard) ---

interface PayloadBlockProps {
  label: string
  payload: Record<string, unknown> | null | undefined
  /** When true, renders in red-tinted block (error display) */
  isError?: boolean
}

function PayloadBlock({ label, payload, isError = false }: PayloadBlockProps) {
  const isEmpty =
    payload === null ||
    payload === undefined ||
    (typeof payload === 'object' && Object.keys(payload).length === 0)

  const [justCopied, setJustCopied] = useState(false)

  // Clear the "Skopiowano" feedback after 1.5s; cleanup on unmount/re-trigger.
  useEffect(() => {
    if (!justCopied) return
    const handle = setTimeout(() => setJustCopied(false), 1500)
    return () => clearTimeout(handle)
  }, [justCopied])

  if (isEmpty) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/60">{messages.workflows.stepNoPayload}</p>
      </div>
    )
  }

  const json = JSON.stringify(payload, null, 2)

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      console.warn('Clipboard API unavailable — payload copy skipped')
      return
    }
    navigator.clipboard.writeText(json).then(
      () => setJustCopied(true),
      (err) => console.warn('Clipboard write failed', err)
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-xs font-medium',
            isError ? 'text-red-400' : 'text-muted-foreground'
          )}
        >
          {label}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          aria-label={
            justCopied
              ? messages.workflows.copyPayloadDone
              : messages.workflows.copyPayload
          }
        >
          {justCopied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
      <pre
        className={cn(
          'mt-1.5 overflow-x-auto overflow-y-auto rounded-md p-3 font-mono text-xs',
          'max-h-48',
          isError
            ? 'border border-red-500/20 bg-red-500/5 text-red-300'
            : 'bg-muted/50 text-foreground'
        )}
      >
        {json}
      </pre>
    </div>
  )
}

// --- Individual step card ---

interface StepCardProps {
  step: StepExecutionWithMeta
  /** When true, both payload blocks are expanded */
  allExpanded: boolean
  /** Snapshot step matching this execution — used for label resolution */
  snapshotStep: WorkflowSnapshot['steps'][number] | null | undefined
}

function StepCard({ step, allExpanded, snapshotStep }: StepCardProps) {
  // Per-step collapse state — `allExpanded` is the INITIAL value only. Parent
  // remounts via `key={...}-${expandKey}` when the global toggle flips, which
  // re-runs this initializer with the new value.
  const [isExpanded, setIsExpanded] = useState(allExpanded)

  const stepTypeLabel =
    ((snapshotStep?.step_config as unknown as Record<string, unknown> | undefined)?._name as string | undefined)
    ?? STEP_TYPE_LABELS[snapshotStep?.step_type as keyof typeof STEP_TYPE_LABELS]
    ?? STEP_TYPE_LABELS[step.step_type as keyof typeof STEP_TYPE_LABELS]
    ?? step.step_type
  const statusLabel =
    STEP_EXECUTION_STATUS_LABELS[step.status] ?? step.status
  const borderClass = STEP_BORDER_CLASSES[step.status] ?? 'border-l-border'
  const badgeClass = STEP_STATUS_BADGE_CLASSES[step.status] ?? 'border-border bg-muted/50 text-muted-foreground'

  const errorPayload =
    step.status === 'failed' && step.output_payload?.error != null
      ? ({ error: step.output_payload.error } as Record<string, unknown>)
      : null

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card pl-4 pr-4 py-4',
        'border-l-4',
        borderClass
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Step header row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{stepTypeLabel}</span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs font-normal', badgeClass)}
              title={step.status === 'cancelled' ? messages.workflows.stepCancelledTooltip : undefined}
            >
              {statusLabel}
            </Badge>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label={isExpanded ? messages.workflows.stepCollapse : messages.workflows.stepExpand}
                aria-expanded={isExpanded}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-150',
                    isExpanded && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Timestamps */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">{messages.workflows.stepStarted}</p>
            <p className="text-xs text-foreground">{formatDate(step.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{messages.workflows.stepCompleted}</p>
            <p className="text-xs text-foreground">{formatDate(step.completed_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{messages.workflows.stepDuration}</p>
            <p className="text-xs text-foreground">
              {formatExecutionDuration(step.started_at, step.completed_at)}
            </p>
          </div>
        </div>

        {/* Delay waiting: show resume_at */}
        {step.status === 'waiting' && step.resume_at && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {messages.workflows.stepResumeAt}:{' '}
              <span className="font-medium">{formatDate(step.resume_at)}</span>
            </span>
          </div>
        )}

        {/* Payload section — vertical stack, collapsible per step */}
        <CollapsibleContent>
          <div className="mt-4 space-y-4 border-t border-border/60 pt-3">
            {/* Input */}
            <PayloadBlock
              label={messages.workflows.stepInput}
              payload={step.input_payload}
            />

            {/* Error block (failed step) or Output */}
            {errorPayload ? (
              <PayloadBlock
                label={messages.workflows.stepError}
                payload={errorPayload}
                isError
              />
            ) : (
              <PayloadBlock
                label={messages.workflows.stepOutput}
                payload={step.output_payload}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// --- Previous attempts accordion ---

interface StepGroupProps {
  group: StepAttemptGroup
  allExpanded: boolean
  snapshotStepMap: Map<string, WorkflowSnapshot['steps'][number]> | null
}

function StepGroup({ group, allExpanded, snapshotStepMap }: StepGroupProps) {
  const [previousOpen, setPreviousOpen] = useState(false)
  const snapshotStep = snapshotStepMap?.get(group.step_id) ?? null
  const latestAttempt = group.attempts[group.attempts.length - 1]
  const previousAttempts = group.attempts.slice(0, -1)

  return (
    <li>
      {/* Latest attempt — always visible */}
      <StepCard step={latestAttempt} allExpanded={allExpanded} snapshotStep={snapshotStep} />

      {/* Previous attempts accordion — only shown if >1 attempt */}
      {previousAttempts.length > 0 && (
        <Collapsible open={previousOpen} onOpenChange={setPreviousOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-4 text-xs text-muted-foreground hover:text-foreground"
            >
              {previousOpen ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" aria-hidden="true" />
                  {messages.workflows.stepHidePreviousAttempts(previousAttempts.length)}
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" aria-hidden="true" />
                  {messages.workflows.stepPreviousAttempts(previousAttempts.length)}
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="mt-2 ml-4 space-y-2 border-l-2 border-border/50 pl-4">
              {previousAttempts.map((attempt) => (
                <li key={attempt.id}>
                  <StepCard step={attempt} allExpanded={allExpanded} snapshotStep={snapshotStep} />
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
    </li>
  )
}

// --- Props ---

interface StepExecutionTimelineProps {
  stepExecutions: StepExecutionWithMeta[]
  snapshot?: WorkflowSnapshot | null
}

// --- Main export ---

export function StepExecutionTimeline({ stepExecutions, snapshot }: StepExecutionTimelineProps) {
  const [allExpanded, setAllExpanded] = useState(false)
  // Key increments on each expand/collapse-all to force StepCard re-mount
  // so the child useState initializers re-run with the new allExpanded value.
  const [expandKey, setExpandKey] = useState(0)

  const groups = useMemo(
    () => groupAttemptsByStep(stepExecutions),
    [stepExecutions]
  )

  const snapshotStepMap = useMemo(() => {
    if (!snapshot?.steps?.length) return null
    return new Map(snapshot.steps.map(s => [s.id, s]))
  }, [snapshot])

  const handleToggleAll = () => {
    const next = !allExpanded
    setAllExpanded(next)
    setExpandKey((k) => k + 1)
  }

  return (
    <section aria-label={messages.workflows.stepTimelineTitle}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {messages.workflows.stepTimelineTitle}
        </h2>
        {stepExecutions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleAll}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label={allExpanded ? messages.workflows.collapseAll : messages.workflows.expandAll}
          >
            {allExpanded ? (
              <>
                <ChevronUp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {messages.workflows.collapseAll}
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {messages.workflows.expandAll}
              </>
            )}
          </Button>
        )}
      </div>

      {stepExecutions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{messages.workflows.stepNoPayload}</p>
      ) : (
        <ol className="space-y-3" aria-label={messages.workflows.stepTimelineTitle}>
          {groups.map((group) => (
            <StepGroup
              key={`${group.step_id}-${expandKey}`}
              group={group}
              allExpanded={allExpanded}
              snapshotStepMap={snapshotStepMap}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
