import { describe, it, expect } from 'vitest'
import {
  evaluatePublishGate,
  getLeadSourceSpec,
  isPublishConfigSatisfied,
  resolveLeadSourceSpec,
  sanitizeLeadSourceConfig,
} from '../specs'

// The config specs are the CLIENT-SAFE single source of truth for the per-provider
// UI descriptor + the publish gate. These pin the storage split (secret → its own
// column, not JSONB) and the draft-vs-publish rule the admin handlers enforce.

describe('lead-source config specs', () => {
  it('getLeadSourceSpec("tally") exposes a required SECRET field named "secret"', () => {
    const spec = getLeadSourceSpec('tally')
    const secretField = spec.configFields.find((f) => f.key === 'secret')
    expect(secretField).toBeDefined()
    expect(secretField?.type).toBe('secret')
    expect(secretField?.required).toBe(true)
    // Secret fields carry a labelKey (messages bridge) — never raw copy here.
    expect(typeof secretField?.labelKey).toBe('string')
    // Tally has NO non-secret config field today (the secret goes to its own
    // column, not lead_source_config).
    expect(spec.configFields.filter((f) => f.type === 'text')).toHaveLength(0)
  })

  it('resolveLeadSourceSpec maps null/undefined/unknown → null and a registered id → the spec', () => {
    expect(resolveLeadSourceSpec(null)).toBeNull()
    expect(resolveLeadSourceSpec(undefined)).toBeNull()
    expect(resolveLeadSourceSpec('nope')).toBeNull()
    expect(resolveLeadSourceSpec('tally')?.id).toBe('tally')
  })
})

describe('isPublishConfigSatisfied (Tally)', () => {
  const spec = getLeadSourceSpec('tally')

  it('is FALSE when the required secret is not set', () => {
    expect(isPublishConfigSatisfied(spec, { hasSecret: false, config: {} })).toBe(false)
  })

  it('is TRUE when the required secret is set', () => {
    expect(isPublishConfigSatisfied(spec, { hasSecret: true, config: {} })).toBe(true)
  })
})

describe('evaluatePublishGate (draft allows null; publish requires provider + config)', () => {
  it('rejects with "no_provider" when no provider is selected (draft state cannot publish)', () => {
    expect(evaluatePublishGate({ provider: null, hasSecret: true, config: {} })).toEqual({
      ok: false,
      reason: 'no_provider',
    })
  })

  it('rejects with "incomplete_config" when Tally is selected but the secret is missing', () => {
    expect(
      evaluatePublishGate({ provider: 'tally', hasSecret: false, config: {} }),
    ).toEqual({ ok: false, reason: 'incomplete_config' })
  })

  it('allows publish when Tally is selected AND the secret is set', () => {
    expect(evaluatePublishGate({ provider: 'tally', hasSecret: true, config: {} })).toEqual({
      ok: true,
    })
  })

  it('rejects an unregistered provider as "no_provider" (no throw)', () => {
    expect(evaluatePublishGate({ provider: 'mystery', hasSecret: true, config: {} })).toEqual({
      ok: false,
      reason: 'no_provider',
    })
  })
})

describe('sanitizeLeadSourceConfig (secret never lands in JSONB; unknown provider → {})', () => {
  it('strips a smuggled secret + unknown keys for Tally (empty non-secret shape)', () => {
    expect(
      sanitizeLeadSourceConfig('tally', { secret: 'leaked', junk: 1 }),
    ).toEqual({})
  })

  it('returns {} for a null/unknown provider (draft config)', () => {
    expect(sanitizeLeadSourceConfig(null, { anything: true })).toEqual({})
    expect(sanitizeLeadSourceConfig('nope', { anything: true })).toEqual({})
  })
})
