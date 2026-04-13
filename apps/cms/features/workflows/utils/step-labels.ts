/**
 * Step label resolver — maps StepType to Polish user-facing strings via messages.ts.
 *
 * WHY separate file (not in step-registry.ts):
 * - step-registry.ts must stay zero-dependency (no messages import) so it works in vitest
 *   without pulling in the full Next.js app context.
 * - This file bridges registry (labelKey) → messages (Polish string) for UI consumers.
 *
 * Usage:
 *   import { STEP_TYPE_LABELS, getStepTypeLabel } from '../utils/step-labels'
 */

import { messages } from '@/lib/messages'
import { STEP_TYPE_LABEL_KEYS, STEP_REGISTRY } from '../step-registry'
import type { StepType } from '../step-registry'

type WorkflowMessages = typeof messages.workflows

/**
 * Resolved Polish labels for each StepType.
 * Single source of truth: messages.workflows.step* keys.
 */
export const STEP_TYPE_LABELS: Record<StepType, string> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [
    s.id,
    messages.workflows[STEP_TYPE_LABEL_KEYS[s.id as StepType] as keyof WorkflowMessages] as string,
  ])
) as Record<StepType, string>

/**
 * Returns a resolved Polish label for a given StepType.
 * Falls back to raw type string for unknown/future types.
 */
export function getStepTypeLabel(type: string): string {
  return STEP_TYPE_LABELS[type as StepType] ?? type
}
