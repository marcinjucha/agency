import { describe, it, expect } from 'vitest'
import { resolveVentureBonusTemplateId } from '../resolve-bonus-template'

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
