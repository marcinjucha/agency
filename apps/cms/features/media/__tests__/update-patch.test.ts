/**
 * Tests for buildMediaItemPatch — the pure decision point of updateMediaItemFn
 * that determines which columns get written. Extracted from the createServerFn
 * handler so the alt_text persistence rule can be verified without driving the
 * RPC pipeline (same approach as applyMediaItemFilters in server-filters.test).
 *
 * The undefined-vs-null distinction is the crux: a rename-only update (no
 * alt_text key) must NOT touch alt_text, while an explicit null clears it.
 */
import { describe, it, expect } from 'vitest'
import { buildMediaItemPatch } from '../server'

describe('buildMediaItemPatch', () => {
  it('always includes name', () => {
    expect(buildMediaItemPatch({ name: 'photo' })).toEqual({ name: 'photo' })
  })

  it('persists alt_text when provided (string)', () => {
    expect(buildMediaItemPatch({ name: 'photo', alt_text: 'opis obrazka' })).toEqual({
      name: 'photo',
      alt_text: 'opis obrazka',
    })
  })

  it('clears alt_text when explicitly null', () => {
    expect(buildMediaItemPatch({ name: 'photo', alt_text: null })).toEqual({
      name: 'photo',
      alt_text: null,
    })
  })

  it('does NOT touch alt_text on a rename-only update (key absent)', () => {
    const patch = buildMediaItemPatch({ name: 'renamed' })
    expect('alt_text' in patch).toBe(false)
  })

  it('treats explicit undefined alt_text as a clear (key present)', () => {
    // Zod .nullable().optional() can yield an explicit `alt_text: undefined`
    // when the key is present; we normalize that to null so it persists a clear.
    const patch = buildMediaItemPatch({ name: 'photo', alt_text: undefined })
    expect(patch).toEqual({ name: 'photo', alt_text: null })
  })
})
