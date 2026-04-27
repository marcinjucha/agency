/**
 * Step slug generation + validation.
 *
 * Slugs identify a step within a workflow for variable references like
 * `{{aiAction.recommendation}}` (replaces positional `step1`, `step2` keys).
 * Must match DB CHECK constraint on `workflow_steps.slug`:
 *   ^[a-z][a-zA-Z0-9]*$  (camelCase, starts with lowercase letter)
 */

/**
 * Map step_type → preferred camelCase base slug.
 * New step types fall back to camelCase conversion of their snake_case id.
 */
const STEP_TYPE_TO_BASE_SLUG: Record<string, string> = {
  get_response: 'getResponse',
  ai_action: 'aiAction',
  update_response: 'updateResponse',
  get_survey_link: 'getSurveyLink',
  send_email: 'sendEmail',
  condition: 'condition',
  delay: 'delay',
  webhook: 'webhook',
}

/** snake_case → camelCase fallback for unknown step types. */
function toCamelCase(stepType: string): string {
  return stepType.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Generate a unique slug for a new step within a workflow.
 *
 * - First instance of a step type gets the bare slug (e.g. `aiAction`).
 * - Subsequent instances get a numeric suffix starting at 2 (`aiAction2`, `aiAction3`, ...).
 * - Gaps are filled — `["aiAction", "aiAction3"]` → `aiAction2`.
 */
export function generateStepSlug(
  stepType: string,
  existingSlugs: ReadonlyArray<string>
): string {
  const base = STEP_TYPE_TO_BASE_SLUG[stepType] ?? toCamelCase(stepType)
  const existing = new Set(existingSlugs)
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}${n}`)) n++
  return `${base}${n}`
}

/** DB CHECK constraint regex: lowercase first letter, then alphanumeric. */
export const SLUG_REGEX = /^[a-z][a-zA-Z0-9]*$/

export function isValidSlugFormat(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}
