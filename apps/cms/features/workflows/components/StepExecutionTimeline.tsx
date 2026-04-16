

import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  Button,
} from '@agency/ui'
import { cn } from '@agency/ui'
import { messages } from '@/lib/messages'
import { formatDate, formatExecutionDuration } from '../utils'
import { STEP_TYPE_LABELS, STEP_EXECUTION_STATUS_LABELS } from '../types'
import type { StepExecutionWithMeta, StepExecutionStatus } from '../types'

// --- Step status → left border color ---

const STEP_BORDER_CLASSES: Record<StepExecutionStatus, string> = {
  completed:  'border-l-emerald-500',
  running:    'border-l-blue-500',
  failed:     'border-l-red-500',
  skipped:    'border-l-border',
  waiting:    'border-l-amber-500',
  processing: 'border-l-amber-500',
  pending:    'border-l-border',
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
}

// --- JSON payload collapsible block ---

interface PayloadBlockProps {
  label: string
  payload: Record<string, unknown> | null | undefined
  /** When true, renders in red-tinted block (error display) */
  isError?: boolean
  /** Controlled open state — driven by parent expand/collapse all */
  open: boolean
}

function PayloadBlock({ label, payload, isError = false, open }: PayloadBlockProps) {
  const isEmpty =
    payload === null ||
    payload === undefined ||
    (typeof payload === 'object' && Object.keys(payload).length === 0)

  if (isEmpty) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/60">{messages.workflows.stepNoPayload}</p>
      </div>
    )
  }

  return (
    <Collapsible open={open}>
      <p
        className={cn(
          'text-xs font-medium',
          isError ? 'text-red-400' : 'text-muted-foreground'
        )}
      >
        {label}
      </p>
      <CollapsibleContent>
        <pre
          className={cn(
            'mt-1.5 overflow-x-auto overflow-y-auto rounded-md p-3 font-mono text-xs',
            'max-h-48',
            isError
              ? 'border border-red-500/20 bg-red-500/5 text-red-300'
              : 'bg-muted/50 text-foreground'
          )}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

// --- Individual step card ---

interface StepCardProps {
  step: StepExecutionWithMeta
  /** When true, both payload blocks are expanded */
  allExpanded: boolean
}

function StepCard({ step, allExpanded }: StepCardProps) {

  const stepTypeLabel =
    STEP_TYPE_LABELS[step.step_type as keyof typeof STEP_TYPE_LABELS] ?? step.step_type
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
      {/* Step header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{stepTypeLabel}</span>
        <Badge
          variant="outline"
          className={cn('text-xs font-normal', badgeClass)}
        >
          {statusLabel}
        </Badge>
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

      {/* Payload section — side-by-side on md+ */}
      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input */}
          <PayloadBlock
            label={messages.workflows.stepInput}
            payload={step.input_payload}
            open={allExpanded}
          />

          {/* Error block (failed step) or Output */}
          {errorPayload ? (
            <PayloadBlock
              label={messages.workflows.stepError}
              payload={errorPayload}
              isError
              open={allExpanded}
            />
          ) : (
            <PayloadBlock
              label={messages.workflows.stepOutput}
              payload={step.output_payload}
              open={allExpanded}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// --- Props ---

interface StepExecutionTimelineProps {
  stepExecutions: StepExecutionWithMeta[]
}

// --- Main export ---

export function StepExecutionTimeline({ stepExecutions }: StepExecutionTimelineProps) {
  const [allExpanded, setAllExpanded] = useState(false)
  // Key increments on each expand/collapse-all to force StepCard re-mount
  // so the child useState initializers re-run with the new allExpanded value.
  const [expandKey, setExpandKey] = useState(0)

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
          {stepExecutions.map((step) => (
            <li key={`${step.id}-${expandKey}`}>
              <StepCard
                step={step}
                allExpanded={allExpanded}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
