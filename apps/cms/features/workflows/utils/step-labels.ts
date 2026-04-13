/**
 * Step label resolver — maps StepType to Polish user-facing strings via messages.ts.
 *
 * WHY separate file (not in step-registry.ts):
 * - step-registry.ts must stay zero-dependency (no messages import) so it works in vitest
 *   without pulling in the full Next.js app context.
 * - This file bridges registry (labelKey) → messages (Polish string) for UI consumers.
 *
 * Usage:
 *   import { STEP_TYPE_LABELS, getStepTypeLabel, resolveOutputSchema } from '../utils/step-labels'
 */

import { messages } from '@/lib/messages'
import { STEP_TYPE_LABEL_KEYS, STEP_TYPE_DESCRIPTION_KEYS, STEP_REGISTRY } from '../step-registry'
import type { StepType, OutputSchemaDefinition, OutputSchemaField } from '../step-registry'

type WorkflowMessages = typeof messages.workflows
type StepLibraryMessages = typeof messages.workflows.stepLibrary

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

/**
 * Resolved Polish descriptions for each StepType.
 * Single source of truth: messages.workflows.stepLibrary.desc* keys.
 */
export const STEP_TYPE_DESCRIPTIONS: Record<StepType, string> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [
    s.id,
    messages.workflows.stepLibrary[STEP_TYPE_DESCRIPTION_KEYS[s.id as StepType] as keyof StepLibraryMessages] as string,
  ])
) as Record<StepType, string>

/**
 * Returns a resolved Polish description for a given StepType.
 * Falls back to raw descriptionKey string for unknown/future types.
 */
export function getStepTypeDescription(type: string): string {
  return STEP_TYPE_DESCRIPTIONS[type as StepType] ?? type
}

type StepOutputFieldMessages = typeof messages.workflows.stepOutputFields

/**
 * Resolves a single output field labelKey to a Polish string.
 * Falls back to raw labelKey when not found in messages.
 * Used as the resolveOutputLabel callback in collectAvailableVariables.
 */
export function getOutputFieldLabel(labelKey: string): string {
  return messages.workflows.stepOutputFields[labelKey as keyof StepOutputFieldMessages] ?? labelKey
}

/**
 * Resolves OutputSchemaDefinition[] (from step-registry) to OutputSchemaField[] (Polish labels).
 * Used by UI consumers (variable inserter, config panels) to display resolved Polish strings.
 *
 * WHY: step-registry.ts stores labelKey (zero-dep). This bridge resolves labelKey → Polish string
 * via messages.workflows.stepOutputFields. Same pattern as step type label resolution.
 */
export function resolveOutputSchema(definitions: OutputSchemaDefinition[]): OutputSchemaField[] {
  return definitions.map((d) => ({
    key: d.key,
    type: d.type,
    label: getOutputFieldLabel(d.labelKey),
  }))
}
