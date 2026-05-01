/**
 * Pure helper — extracts client contact info from survey answers using semantic_role.
 *
 * Uses semantic_role to find name/email/company/phone fields. Falls back to
 * positional guess (first answer = name) for old surveys without semantic_role.
 *
 * No hooks, no JSX, no DB — pure logic colocated under `utils/` per project
 * convention (TDD-friendly, reusable across server fns).
 *
 * @module apps/cms/features/intake/utils/extractClientInfo
 */

import type { Question } from '@agency/validators'
import type { ClientInfo } from '../types'

export function extractClientInfo(
  answers: Record<string, unknown>,
  questions: unknown[],
  fallbackIndex: number,
): ClientInfo {
  const typedQuestions = questions as Question[]

  const findByRole = (role: string): string | null => {
    const q = typedQuestions.find((q) => q.semantic_role === role)
    if (!q) return null
    const answer = answers[q.id]
    return typeof answer === 'string' && answer.trim() ? answer.trim() : null
  }

  const name = findByRole('client_name')
  const email = findByRole('client_email')
  const companyName = findByRole('company_name')
  const phone = findByRole('phone')

  // Display name priority: company → name → email → first answer → fallback
  const displayName =
    companyName ||
    name ||
    email ||
    (() => {
      const values = Object.values(answers)
      if (values.length > 0 && typeof values[0] === 'string' && values[0].trim()) {
        return values[0].trim()
      }
      return `Odpowiedź #${fallbackIndex}`
    })()

  return {
    name: displayName,
    email,
    companyName,
    phone,
  }
}
