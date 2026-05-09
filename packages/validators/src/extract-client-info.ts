/**
 * Client Contact Info Extraction
 *
 * Pure helpers — derive client identity from survey answers using `semantic_role`
 * markers on `Question[]`. Lives in `@agency/validators` because it depends only
 * on the `Question` type from `./common` and has zero React/DB/runtime deps.
 *
 * Two helpers, two consumers:
 *   - `findAnswerByRole(answers, questions, role)` — strict, returns string | null.
 *     Use this when null is the right answer (e.g. booking flow MUST fail closed
 *     when client name/email is missing — falling back to "first answer" or
 *     `Odpowiedź #N` would put garbage like "yes, I agree" on calendar invites).
 *
 *   - `extractClientInfo(answers, questions, fallbackIndex)` — lenient, applies a
 *     display-name fallback chain (company → name → email → first answer →
 *     `Odpowiedź #N`). Use this for CMS list/pipeline UIs where any human-
 *     readable label is better than "no name".
 *
 * @module @agency/validators/extract-client-info
 */

import type { Question, SemanticRole } from './common'

/**
 * Client contact info extracted from survey answers via semantic_role.
 * `name` falls back through display-name chain — see `extractClientInfo`.
 */
export interface ClientInfo {
  name: string
  email: string | null
  companyName: string | null
  phone: string | null
}

/**
 * Find the trimmed string answer for the question with the given semantic_role.
 * Returns null if:
 *   - no question has that role
 *   - the answer is missing / non-string / blank after trim
 *
 * Use this for the booking flow, workflow triggers, or anywhere null-or-string
 * is the right contract.
 */
export function findAnswerByRole(
  answers: Record<string, unknown>,
  questions: unknown[],
  role: SemanticRole,
): string | null {
  const typedQuestions = questions as Question[]
  const q = typedQuestions.find((question) => question.semantic_role === role)
  if (!q) return null
  const answer = answers[q.id]
  return typeof answer === 'string' && answer.trim() ? answer.trim() : null
}

/**
 * Extract client info with a lenient display-name fallback chain.
 *
 * Display name priority: company → name → email → first answer → `Odpowiedź #N`
 * (where N is `fallbackIndex`).
 *
 * Use this for CMS list/pipeline UIs where any label is better than nothing.
 * Do NOT use for booking flows / external integrations — the fallback can
 * produce embarrassing labels (e.g. "yes, I agree" picked up as a name).
 */
export function extractClientInfo(
  answers: Record<string, unknown>,
  questions: unknown[],
  fallbackIndex: number,
): ClientInfo {
  const name = findAnswerByRole(answers, questions, 'client_name')
  const email = findAnswerByRole(answers, questions, 'client_email')
  const companyName = findAnswerByRole(answers, questions, 'company_name')
  const phone = findAnswerByRole(answers, questions, 'phone')

  // Display-name fallback is intentional CMS-UI policy.
  // Order: company → name → email → first answer → "Odpowiedź #N".
  // Phone exists in `SemanticRole` but is intentionally NOT in the chain —
  // raw phone numbers as a display label look bad in lists.
  // Rule of Two: don't introduce a registry/strategy until a second consumer
  // wants a different ordering. Today this is the only consumer.
  const displayName = companyName || name || email || firstAnswerOrFallback(answers, fallbackIndex)

  return {
    name: displayName,
    email,
    companyName,
    phone,
  }
}

function firstAnswerOrFallback(answers: Record<string, unknown>, fallbackIndex: number): string {
  const values = Object.values(answers)
  if (values.length > 0 && typeof values[0] === 'string' && values[0].trim()) {
    return values[0].trim()
  }
  return `Odpowiedź #${fallbackIndex}`
}
