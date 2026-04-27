/**
 * context-builder.ts — LLM context string construction from variableContext.
 *
 * CANONICAL SOURCE for the flattenContextForLlm function.
 * The n8n Step - AI Action Handler.json Build Prompt node contains a copy
 * of this logic. Changes here must be mirrored there.
 *
 * Zero external dependencies — safe to import in vitest without alias setup.
 */

/** Shape of the execution variableContext passed through the workflow. */
export type WorkflowVariableContext = Record<string, unknown>

/**
 * Flattens a step-namespaced variableContext into a single-level string
 * suitable for injection into an LLM prompt.
 *
 * Rules:
 * - Trigger-level scalars (string, number, boolean) → `key: "value"`
 * - Step namespace objects (e.g. `step1: { overallScore: 7 }`) → expand one
 *   level: each inner field becomes its own `field: value` line
 * - `aiOutputJson` is always skipped — it is an aggregate of all other step
 *   fields and adds redundant noise to the prompt
 * - Arrays are treated as scalars (not flattened further)
 * - `null` values are treated as scalars
 */
export function flattenContextForLlm(context: WorkflowVariableContext): string {
  const entries: string[] = []

  for (const [k, v] of Object.entries(context)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      // Step namespace object — expand one level
      const stepObj = v as Record<string, unknown>
      for (const [fk, fv] of Object.entries(stepObj)) {
        if (fk !== 'aiOutputJson') {
          entries.push(`${fk}: ${JSON.stringify(fv)}`)
        }
      }
    } else {
      entries.push(`${k}: ${JSON.stringify(v)}`)
    }
  }

  return entries.join('\n')
}
