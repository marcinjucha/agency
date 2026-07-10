import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
// Importing the barrel triggers the side-effect registration on module load
// (index.server.ts calls registerLeadSource(tallyLeadSource)) — mirrors the
// esp registry test.
import {
  getLeadSource,
  isLeadSourceRegistered,
  resolveLeadSource,
} from '../index.server'
import { tallyLeadSource } from '../tally.server'
import { getLeadSourceSpec } from '../specs'
import { LEAD_SOURCE_IDS, type LeadSourceId } from '../types'

describe('lead-source registry', () => {
  it('resolves the registered tally provider via the barrel side-effect', () => {
    expect(getLeadSource('tally')).toBe(tallyLeadSource)
  })

  it('reports tally as registered and an unknown id as not', () => {
    expect(isLeadSourceRegistered('tally')).toBe(true)
    expect(isLeadSourceRegistered('nope')).toBe(false)
  })

  it('throws for an unregistered provider id', () => {
    expect(() => getLeadSource('nope' as LeadSourceId)).toThrow()
  })

  it('resolveLeadSource maps null/undefined/unknown → null and a registered id → the provider (NEVER throws)', () => {
    // iter-1 LOW fix: the route resolves the provider via resolveLeadSource, so
    // an unknown or NULL value must return null (→ uniform 401) — never throw.
    expect(resolveLeadSource(null)).toBeNull()
    expect(resolveLeadSource(undefined)).toBeNull()
    expect(resolveLeadSource('unknown-provider')).toBeNull()
    expect(resolveLeadSource('tally')).toBe(tallyLeadSource)
    // Explicitly assert the no-throw contract on an unknown id.
    expect(() => resolveLeadSource('mystery')).not.toThrow()
  })

  it('every registered provider exposes a callable verify + parse + id + label (smoke)', () => {
    for (const id of Object.values(LEAD_SOURCE_IDS)) {
      const provider = getLeadSource(id)
      expect(typeof provider.verify).toBe('function')
      expect(typeof provider.parse).toBe('function')
      expect(provider.id).toBe(id)
      expect(typeof provider.label).toBe('string')
    }
  })
})

// ---------------------------------------------------------------------------
// Three-way drift guard: LEAD_SOURCE_IDS ↔ LEAD_SOURCE_SPECS ↔ runtime registry.
// The ids set + specs map are compile-exhaustive (Record<LeadSourceId,...>), but
// the RUNTIME registry (registerLeadSource) is NOT — a provider added to
// LEAD_SOURCE_IDS + specs but never registered would pass validation + the
// publish gate, yet resolveLeadSource() returns null at ingest → every webhook
// 401s silently. Importing the barrel above ran the side-effect registration, so
// asserting registration here locks all three in sync.
// ---------------------------------------------------------------------------
describe('lead-source three-way consistency (ids ↔ specs ↔ registry)', () => {
  it('every LEAD_SOURCE_ID is registered at runtime AND has a spec', () => {
    for (const id of Object.values(LEAD_SOURCE_IDS)) {
      // Runtime registry (the axis that is NOT compile-enforced).
      expect(isLeadSourceRegistered(id)).toBe(true)
      // Spec map — getLeadSourceSpec returns LEAD_SOURCE_SPECS[id].
      const spec = getLeadSourceSpec(id)
      expect(spec).toBeDefined()
      expect(spec.id).toBe(id)
    }
  })
})

describe('tally lead-source provider — behavior parity with underlying fns', () => {
  const SECRET = 'super-secret-signing-key'
  const RAW = JSON.stringify({ eventType: 'FORM_RESPONSE', data: { fields: [] } })
  const sign = (body: string, secret: string): string =>
    crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')

  it('verify accepts a valid Tally-Signature header (reads its own header internally)', () => {
    const headers = new Headers({ 'Tally-Signature': sign(RAW, SECRET) })
    expect(
      tallyLeadSource.verify({ rawBody: RAW, headers, secret: SECRET }),
    ).toEqual({ valid: true })
  })

  it('verify rejects when the Tally-Signature header is absent', () => {
    const result = tallyLeadSource.verify({
      rawBody: RAW,
      headers: new Headers(),
      secret: SECRET,
    })
    expect(result.valid).toBe(false)
  })

  it('verify rejects a tampered body', () => {
    const headers = new Headers({ 'Tally-Signature': sign(RAW, SECRET) })
    const result = tallyLeadSource.verify({
      rawBody: RAW + ' ',
      headers,
      secret: SECRET,
    })
    expect(result.valid).toBe(false)
  })

  it('verify rejects when the secret is null (contract accepts string | null)', () => {
    const headers = new Headers({ 'Tally-Signature': sign(RAW, SECRET) })
    const result = tallyLeadSource.verify({ rawBody: RAW, headers, secret: null })
    expect(result.valid).toBe(false)
  })

  it('parse maps a valid FORM_RESPONSE payload to a MappedLead', () => {
    const payload = {
      eventType: 'FORM_RESPONSE',
      data: {
        submissionId: 'sub_1',
        fields: [{ key: 'q', label: 'Email', type: 'INPUT_EMAIL', value: 'a@b.pl' }],
      },
    }
    const result = tallyLeadSource.parse(payload)
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toMatchObject({
      email: 'a@b.pl',
      submissionId: 'sub_1',
    })
  })

  it('parse returns err for an unusable payload', () => {
    expect(tallyLeadSource.parse(null).isErr()).toBe(true)
  })
})
