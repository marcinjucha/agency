import type { TriggerType, StepType, ExecutionStatus, StepExecutionStatus } from './types'
import {
  TRIGGER_TYPE_LABELS,
  STEP_TYPE_LABELS,
  EXECUTION_STATUS_LABELS,
  STEP_EXECUTION_STATUS_LABELS,
} from './types'

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
