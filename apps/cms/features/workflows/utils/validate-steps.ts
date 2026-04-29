import { z, type ZodSchema } from 'zod'
import { stepConfigSchemaMap, triggerConfigSchemaMap } from '../validation'
import { PLACEHOLDER_STEP_MAP, type StepType } from '../step-registry'
import type { TriggerType } from '../types'

/**
 * Combined dispatch table: real step types + trigger sub-types map to their schemas.
 *
 * - Real step types (send_email, switch, ...) → stepConfigSchemaMap
 * - Trigger sub-types (survey_submitted, booking_created, ...) → triggerConfigSchemaMap
 *   (each maps to a discriminated-union member with `type: z.literal('<sub-type>')`)
 *
 * Placeholder step types (PLACEHOLDER_STEP_MAP) intentionally have no schema —
 * showcase only, never executed. Unknown step types are skipped silently.
 */
const SCHEMA_BY_STEP_TYPE: Record<StepType | TriggerType, ZodSchema> = {
  ...stepConfigSchemaMap,
  ...triggerConfigSchemaMap,
}

export interface StepValidationError {
  stepId: string
  stepType: string
  /** Human-readable summary, e.g. "Recipient required" or "Recipient required (+2 more)" */
  summary: string
  /** Full Zod issues for per-field display */
  issues: z.ZodIssue[]
}

export interface ValidationResult {
  isValid: boolean
  errors: StepValidationError[]
  /** Quick lookup by step id */
  errorsByStepId: Map<string, StepValidationError>
}

interface StepLike {
  id: string
  step_type: string
  step_config: Record<string, unknown>
}

/**
 * Validate every step's `step_config` against its registered Zod schema.
 *
 * Used by:
 * - Iter 4: client-side save gate + server-side defensive re-validation
 * - Iter 5: canvas visual feedback (errorsByStepId for per-node highlight)
 *
 * Skip semantics:
 * - Placeholder step types (PLACEHOLDER_STEP_MAP) → skipped (showcase only)
 * - Unknown step types → skipped (canvas allows arbitrary draft state)
 *
 * Schema invocation: `{ type: step.step_type, ...step.step_config }` —
 * each registered schema declares `type: z.literal('<step_type>')` as its
 * discriminator, so we inject it from the row's step_type column.
 */
export function validateAllSteps(steps: StepLike[]): ValidationResult {
  const errors: StepValidationError[] = []
  const errorsByStepId = new Map<string, StepValidationError>()

  for (const step of steps) {
    if (isPlaceholderStepType(step.step_type)) continue
    const schema = (SCHEMA_BY_STEP_TYPE as Record<string, ZodSchema>)[step.step_type]
    if (!schema) continue

    const result = schema.safeParse({ type: step.step_type, ...step.step_config })
    if (result.success) continue

    const error: StepValidationError = {
      stepId: step.id,
      stepType: step.step_type,
      summary: summarizeIssues(result.error.issues),
      issues: result.error.issues,
    }
    errors.push(error)
    errorsByStepId.set(step.id, error)
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsByStepId,
  }
}

function isPlaceholderStepType(stepType: string): boolean {
  return (PLACEHOLDER_STEP_MAP as Record<string, unknown>)[stepType] !== undefined
}

function summarizeIssues(issues: z.ZodIssue[]): string {
  const first = issues[0]?.message ?? 'Validation failed'
  if (issues.length <= 1) return first
  return `${first} (+${issues.length - 1} more)`
}
