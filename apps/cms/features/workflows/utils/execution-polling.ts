import type { ExecutionStatus } from '../types'

/**
 * Polling cadence for execution list/detail queries when active runs are present.
 * Used by ExecutionList, ExecutionDetail, ExecutionHistoryListView, ExecutionHistoryDetailView.
 */
export const EXECUTION_POLL_INTERVAL_MS = 10_000

/**
 * Statuses that indicate the execution is still progressing — polling continues.
 * Mirrors the active state set on `workflow_executions.status`.
 */
export const ACTIVE_EXECUTION_STATUSES: ExecutionStatus[] = ['pending', 'running', 'paused']

/**
 * Statuses that indicate the execution has finished — polling can stop.
 * Inverse of ACTIVE_EXECUTION_STATUSES (cancelled is also terminal).
 */
export const TERMINAL_EXECUTION_STATUSES: ExecutionStatus[] = ['completed', 'failed', 'cancelled']
