import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import type { TriggerType, StepType, ExecutionStatus, StepExecutionStatus } from './types'
import {
  TRIGGER_TYPE_LABELS,
  STEP_TYPE_LABELS,
  EXECUTION_STATUS_LABELS,
  STEP_EXECUTION_STATUS_LABELS,
} from './types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Format a date string as relative time (< 7 days) or localized date.
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '\u2014'
  try {
    const date = new Date(dateString)
    const now = new Date()
    if (now.getTime() - date.getTime() < SEVEN_DAYS_MS) {
      return formatDistanceToNow(date, { addSuffix: true, locale: pl })
    }
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '\u2014'
  }
}

export function getTriggerTypeLabel(type: TriggerType): string {
  return TRIGGER_TYPE_LABELS[type] ?? type
}

export function getStepTypeLabel(type: StepType): string {
  return STEP_TYPE_LABELS[type] ?? type
}

export function getExecutionStatusLabel(status: ExecutionStatus): string {
  return EXECUTION_STATUS_LABELS[status] ?? status
}

export function getStepExecutionStatusLabel(status: StepExecutionStatus): string {
  return STEP_EXECUTION_STATUS_LABELS[status] ?? status
}

/**
 * Format duration in seconds to human-readable Polish string.
 * Examples: "5 min", "1 godz 30 min", "45 s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} godz`
  return `${hours} godz ${minutes} min`
}

/**
 * Format elapsed time between two ISO timestamp strings.
 * Used in execution list/detail/timeline to show step durations.
 * Examples: "5s", "2m 30s", "1g 15m"
 */
export function formatExecutionDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '\u2013'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return `${h}g ${m % 60}m`
}
