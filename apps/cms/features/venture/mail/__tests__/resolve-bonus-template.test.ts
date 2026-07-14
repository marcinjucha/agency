import { describe, it, expect, vi } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'
import {
  resolveVentureBonusTemplateId,
  resolveBonusTemplateByPrecedence,
} from '../resolve-bonus-template'

// INV-4 (one-rule): campaign assignment → tenant default → none. The pure
// statement of the precedence the tiered DB read (fetchBonusTemplate) honours.
describe('resolveVentureBonusTemplateId', () => {
  it('campaign assignment wins when present', () => {
    expect(resolveVentureBonusTemplateId('campaign-tmpl', 'default-tmpl')).toBe('campaign-tmpl')
  })

  it('campaign assignment wins even when there is no default', () => {
    expect(resolveVentureBonusTemplateId('campaign-tmpl', null)).toBe('campaign-tmpl')
  })

  it('falls back to the tenant default when the campaign has no assignment', () => {
    expect(resolveVentureBonusTemplateId(null, 'default-tmpl')).toBe('default-tmpl')
  })

  it('returns null (no-drop signal, INV-1) when neither is set', () => {
    expect(resolveVentureBonusTemplateId(null, null)).toBeNull()
  })
})

// The SHARED async tiered-precedence mechanism both the SEND path
// (ingest.fetchBonusTemplate) and the effective-send CARD
// (admin-handlers.resolveEffectiveVentureTemplate) now call — the ONE definition
// that closes the prior parallel-copy drift. Generic over row type + error type.
describe('resolveBonusTemplateByPrecedence (shared, both callers agree)', () => {
  it('by-id usable → wins; default reader NEVER runs (lazy short-circuit)', async () => {
    const readDefault = vi.fn(() => okAsync<string | null, string>('default'))
    const result = await resolveBonusTemplateByPrecedence(
      () => okAsync<string | null, string>('by-id'),
      readDefault,
    )
    expect(result._unsafeUnwrap()).toBe('by-id')
    // The send path must NOT issue the default read when an assignment resolves.
    expect(readDefault).not.toHaveBeenCalled()
  })

  it('by-id null → falls through to the default reader', async () => {
    const result = await resolveBonusTemplateByPrecedence(
      () => okAsync<string | null, string>(null),
      () => okAsync<string | null, string>('default'),
    )
    expect(result._unsafeUnwrap()).toBe('default')
  })

  it('neither resolves → null (no-drop signal)', async () => {
    const result = await resolveBonusTemplateByPrecedence(
      () => okAsync<string | null, string>(null),
      () => okAsync<string | null, string>(null),
    )
    expect(result._unsafeUnwrap()).toBeNull()
  })

  it('propagates a by-id error (default reader never runs) — card error channel intact', async () => {
    const readDefault = vi.fn(() => okAsync<string | null, string>('default'))
    const result = await resolveBonusTemplateByPrecedence(
      () => errAsync<string | null, string>('boom'),
      readDefault,
    )
    expect(result._unsafeUnwrapErr()).toBe('boom')
    expect(readDefault).not.toHaveBeenCalled()
  })
})
