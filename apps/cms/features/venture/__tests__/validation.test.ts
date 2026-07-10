import { describe, it, expect } from 'vitest'
import { createClientSchema, createCampaignSchema } from '../validation'

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

// createCampaignSchema wire boundary for the pluggable lead source. The provider
// is validated with z.string().refine(isLeadSourceId) — NEVER z.enum (which would
// throw synchronously in the inputValidator). NULL provider is a valid DRAFT.
describe('createCampaignSchema — lead_source_provider (draft allows null)', () => {
  const base = {
    client_id: '11111111-1111-1111-1111-111111111111',
    slug: 'launch',
  }

  it('accepts an omitted provider (draft — no lead source selected yet)', () => {
    expect(createCampaignSchema.safeParse({ ...base }).success).toBe(true)
  })

  it('accepts an explicit null provider (draft)', () => {
    expect(
      createCampaignSchema.safeParse({ ...base, lead_source_provider: null }).success,
    ).toBe(true)
  })

  it('accepts a registered provider id ("tally")', () => {
    const result = createCampaignSchema.safeParse({
      ...base,
      lead_source_provider: 'tally',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unregistered provider id (registry-membership refine, not z.enum)', () => {
    const result = createCampaignSchema.safeParse({
      ...base,
      lead_source_provider: 'mystery',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a generic non-secret lead_source_config object', () => {
    expect(
      createCampaignSchema.safeParse({
        ...base,
        lead_source_provider: 'tally',
        lead_source_config: { foo: 'bar' },
      }).success,
    ).toBe(true)
  })
})

// Regression test (2026-07-10): creating a NEW campaign as a DRAFT (provider =
// "Brak / szkic") surfaced the "Popraw błędy w formularzu" banner with NO
// visible field error, blocking Save. Root cause: the campaign editor's RHF
// default for `tally_webhook_secret` is '' (untouched text input), but the
// schema was `z.string().trim().min(1).nullable().optional()` — WITHOUT
// `.or(z.literal(''))`. An empty string is neither undefined nor null, so it
// fell through to `.min(1)` and failed. In draft state the secret input is
// hidden (no provider selected) so the error had no field to attach to —
// hence the invisible banner. Same bug class + fix as the client secret
// fields (see createClientSchema tests above). This pins the payload EXACTLY
// as RHF submits it for a fresh draft campaign.
describe('createCampaignSchema — draft save with the exact RHF default payload', () => {
  const base = {
    client_id: '11111111-1111-1111-1111-111111111111',
    slug: 'launch',
  }
  // Mirrors VentureCampaignEditor defaultValues for a NEW campaign after the
  // operator picked a client + typed a display name, left as a DRAFT.
  const rhfDraftDefaults = {
    client_id: '11111111-1111-1111-1111-111111111111',
    slug: 'test',
    display_name: 'Test',
    brand: { primary: '', accent: '', bg: '', logo_url: '', font: '' },
    esp_provider: 'beehiiv',
    esp_audience_ref: '',
    esp_tag_launch: 'launch-notify',
    // Untouched masked secret input — RHF submits '' (never undefined).
    tally_webhook_secret: '',
    lead_source_provider: null,
    lead_source_config: {},
    published: false,
  }

  it('accepts a blank tally_webhook_secret (untouched masked field) on a draft save', () => {
    const result = createCampaignSchema.safeParse(rhfDraftDefaults)
    expect(result.success).toBe(true)
  })

  it('accepts a blank tally_webhook_secret in isolation (nullable/optional/empty gap)', () => {
    expect(
      createCampaignSchema.safeParse({ ...base, tally_webhook_secret: '' }).success,
    ).toBe(true)
  })

  it('still accepts a real, non-empty tally_webhook_secret', () => {
    expect(
      createCampaignSchema.safeParse({ ...base, tally_webhook_secret: 's3cr3t-value' })
        .success,
    ).toBe(true)
  })

  it('still accepts an omitted / null tally_webhook_secret (create with no secret yet)', () => {
    expect(createCampaignSchema.safeParse({ ...base }).success).toBe(true)
    expect(
      createCampaignSchema.safeParse({ ...base, tally_webhook_secret: null }).success,
    ).toBe(true)
  })
})

// Regression test (2026-07-09): Google displays a Gmail App Password in 4
// space-separated blocks of 4 chars (e.g. `qcfn tnzx owzt irfg`) for
// readability, but the real SMTP secret is 16 chars with NO spaces. A user
// pasted the value WITH spaces straight from Google's UI. `.trim()` alone
// only strips leading/trailing whitespace, not internal spaces — this pins
// the fix that strips ALL whitespace via `.transform()`.
describe('createClientSchema — gmail_app_password whitespace normalization', () => {
  const basePayload = {
    name: 'Kacper',
    slug: 'kacper',
    mail_provider: 'gmail_smtp' as const,
    gmail_address: 'test@gmail.com',
  }

  it('strips ALL internal whitespace from a Gmail App Password pasted with spaces', () => {
    const result = createClientSchema.safeParse({
      ...basePayload,
      gmail_app_password: 'qcfn tnzx owzt irfg',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.gmail_app_password).toBe('qcfntnzxowztirfg')
      expect(result.data.gmail_app_password).toHaveLength(16)
    }
  })

  it('still passes an empty string through unchanged (the "leave untouched" sentinel)', () => {
    const result = createClientSchema.safeParse({
      ...basePayload,
      gmail_app_password: '',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.gmail_app_password).toBe('')
    }
  })
})
