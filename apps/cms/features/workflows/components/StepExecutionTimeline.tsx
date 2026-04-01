'use client'

import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
}

function PayloadBlock({ label, payload, isError = false }: PayloadBlockProps) {
  const [open, setOpen] = useState(false)

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
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between">
        <p
          className={cn(
            'text-xs font-medium',
            isError ? 'text-red-400' : 'text-muted-foreground'
          )}
        >
          {label}
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

function StepCard({ step }: { step: StepExecutionWithMeta }) {
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

      {/* Payload section */}
      <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
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
    </div>
  )
}

// --- Props ---

interface StepExecutionTimelineProps {
  stepExecutions: StepExecutionWithMeta[]
}

// --- Main export ---

export function StepExecutionTimeline({ stepExecutions }: StepExecutionTimelineProps) {
  return (
    <section aria-label={messages.workflows.stepTimelineTitle}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {messages.workflows.stepTimelineTitle}
      </h2>

      {stepExecutions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{messages.workflows.stepNoPayload}</p>
      ) : (
        <ol className="space-y-3" aria-label={messages.workflows.stepTimelineTitle}>
          {stepExecutions.map((step) => (
            <li key={step.id}>
              <StepCard step={step} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
