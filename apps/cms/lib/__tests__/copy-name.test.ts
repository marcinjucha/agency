import { describe, it, expect } from 'vitest'
import { uniqueCopyName, uniqueCopySlug } from '../copy-name'

describe('uniqueCopyName', () => {
  it('uses "(kopia)" when free', () => {
    expect(uniqueCopyName('Navy', [])).toBe('Navy (kopia)')
  })

  it('increments past case-insensitive collisions', () => {
    expect(uniqueCopyName('Navy', ['navy (kopia)', 'NAVY (KOPIA 2)'])).toBe('Navy (kopia 3)')
  })

  it('leaves the result unclamped when no maxLength is given', () => {
    const base = 'x'.repeat(120)
    expect(uniqueCopyName(base, [])).toHaveLength(120 + ' (kopia)'.length)
  })

  it('clamps the WHOLE result, not just the base', () => {
    // `email_templates.label` is zod .max(100) and the editor re-sends `label`
    // on every save — an overflowing copy would be permanently unsaveable.
    const base = 'a'.repeat(95)
    const result = uniqueCopyName(base, [], 100)
    expect(result.length).toBeLessThanOrEqual(100)
    expect(result.endsWith(' (kopia)')).toBe(true)
  })

  it('keeps the numbered candidate inside maxLength too', () => {
    const base = 'a'.repeat(95)
    const first = uniqueCopyName(base, [], 100)
    const second = uniqueCopyName(base, [first], 100)
    expect(second.length).toBeLessThanOrEqual(100)
    expect(second).not.toBe(first)
  })
})

describe('uniqueCopySlug', () => {
  it('appends "_kopia" for the underscore grammar', () => {
    expect(uniqueCopySlug('venture_bonus', [], { sep: '_' })).toBe('venture_bonus_kopia')
  })

  it('appends "-kopia" for the dash grammar', () => {
    expect(uniqueCopySlug('warsztaty', [], { sep: '-' })).toBe('warsztaty-kopia')
  })

  it('increments past collisions', () => {
    expect(
      uniqueCopySlug('warsztaty', ['warsztaty-kopia', 'warsztaty-kopia-2'], { sep: '-' })
    ).toBe('warsztaty-kopia-3')
  })

  it('clamps the whole slug and stays inside the template slug grammar', () => {
    // `templateSlugSchema` is .max(50) + /^[a-z][a-z0-9_]*$/ — trimming the base
    // to 50 and THEN appending "_kopia" would produce 56 chars and fail zod.
    const base = 'a'.repeat(48)
    const result = uniqueCopySlug(base, [], { sep: '_', maxLength: 50 })
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result).toMatch(/^[a-z][a-z0-9_]*$/)
  })

  it('does not leave a dangling separator after clamping', () => {
    const result = uniqueCopySlug('abcdefghij', [], { sep: '-', maxLength: 12 })
    expect(result.length).toBeLessThanOrEqual(12)
    expect(result).not.toMatch(/--/)
  })
})
