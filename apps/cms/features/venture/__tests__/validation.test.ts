import { describe, it, expect } from 'vitest'
import { createClientSchema } from '../validation'

// Regression tests for a real bug caught live in the browser (2026-07-09):
// the "Popraw błędy w formularzu" banner appeared with NO visible field
// error when a client used mail_provider='gmail_smtp' and the (hidden,
// inactive) "Resend własny" fields were left blank. Root cause: `.optional()`
// only accepts `undefined`, `.nullable()` only accepts `null` — neither
// matches RHF's `''` for an untouched text input. `validation.ts` is
// normally NOT unit-tested (Zod declarative, per features/CLAUDE.md) — this
// file is the documented exception because it pins a real production bug,
// not the schema's declarative shape.
describe('createClientSchema — blank secret/email fields', () => {
  it('accepts blank Resend fields when the client uses Gmail (the exact bug scenario)', () => {
    const result = createClientSchema.safeParse({
      name: 'Kacper',
      slug: 'kacper',
      mail_provider: 'gmail_smtp',
      resend_api_key: '',
      resend_from_email: '',
      gmail_address: 'test@gmail.com',
      gmail_app_password: 'xxxxxxxxxxxxxxxx',
    })

    expect(result.success).toBe(true)
  })

  it('accepts blank Gmail fields when the client uses Resend', () => {
    const result = createClientSchema.safeParse({
      name: 'Kacper',
      slug: 'kacper',
      mail_provider: 'resend_own',
      resend_api_key: 're_xxxxxxxxxxxxxxxx',
      resend_from_email: 'kontakt@kacper.pl',
      gmail_address: '',
      gmail_app_password: '',
    })

    expect(result.success).toBe(true)
  })

  it('still rejects a genuinely invalid email — blank-string fix must not weaken real validation', () => {
    const result = createClientSchema.safeParse({
      name: 'Kacper',
      slug: 'kacper',
      mail_provider: 'resend_own',
      resend_from_email: 'not-an-email',
    })

    expect(result.success).toBe(false)
  })

  it('still rejects a whitespace-only secret (only a truly empty string counts as "not set")', () => {
    // `.or(z.literal(''))` matches the RAW input against the empty-string
    // literal — it does NOT match after `.trim()` produces ''. A
    // whitespace-only value is user-typed content, not an untouched RHF
    // field, so falling through to `.trim().min(1)` (which then correctly
    // fails) is the desired behavior, not a regression.
    const result = createClientSchema.safeParse({
      name: 'Kacper',
      slug: 'kacper',
      mail_provider: 'resend_own',
      resend_api_key: '   ',
    })

    expect(result.success).toBe(false)
  })

  it('still accepts a real, non-empty secret', () => {
    const result = createClientSchema.safeParse({
      name: 'Kacper',
      slug: 'kacper',
      mail_provider: 'resend_own',
      resend_api_key: 're_realvaluexxxxxxxx',
    })

    expect(result.success).toBe(true)
  })
})
