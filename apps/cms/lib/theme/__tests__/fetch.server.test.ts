import { describe, it, expect, vi } from 'vitest'
import { fetchThemeTokens } from '../fetch.server'

// ---------------------------------------------------------------------------
// fetchThemeTokens — named-theme FK → ThemeTokens, inline fallback, never-throw.
//
// One `.from('so_themes')` call (`.select().eq().maybeSingle()`) — ONLY when the
// FK id is non-null. Each test builds a single-`.from()` mock and asserts whether
// so_themes was queried at all.
// ---------------------------------------------------------------------------

function mockSupabase(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn(() => Promise.resolve(result))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from }, from, select, eq, maybeSingle }
}

describe('fetchThemeTokens', () => {
  it('resolves the named theme tokens when theme_id is set', async () => {
    const supabase = mockSupabase({
      data: { tokens: { primary: '#123456', text: '#abcdef' } },
      error: null,
    })
    const tokens = await fetchThemeTokens(supabase.client, 'theme-1', null)
    expect(tokens).toEqual({ primary: '#123456', text: '#abcdef' })
    expect(supabase.from).toHaveBeenCalledWith('so_themes')
    expect(supabase.eq).toHaveBeenCalledWith('id', 'theme-1')
  })

  it('uses the inline fallback and does NOT query so_themes when theme_id is null', async () => {
    const supabase = mockSupabase({ data: null, error: null })
    const tokens = await fetchThemeTokens(supabase.client, null, { primary: '#0a0a0a' })
    expect(tokens).toEqual({ primary: '#0a0a0a' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('falls back to inline when the referenced theme row is gone (no row)', async () => {
    const supabase = mockSupabase({ data: null, error: null })
    const tokens = await fetchThemeTokens(supabase.client, 'missing', { primary: '#111111' })
    expect(tokens).toEqual({ primary: '#111111' })
  })

  it('falls back to inline on a query error (never throws)', async () => {
    const supabase = mockSupabase({ data: null, error: { message: 'boom' } })
    const tokens = await fetchThemeTokens(supabase.client, 'theme-1', { text: '#222222' })
    expect(tokens).toEqual({ text: '#222222' })
  })

  it('degrades to {} when neither the named theme nor a valid inline exists', async () => {
    const supabase = mockSupabase({ data: null, error: { message: 'boom' } })
    const tokens = await fetchThemeTokens(supabase.client, 'theme-1', null)
    expect(tokens).toEqual({})
  })

  it('sanitises a non-hex inline value to {} at the boundary', async () => {
    const supabase = mockSupabase({ data: null, error: null })
    const tokens = await fetchThemeTokens(supabase.client, null, { primary: 'var(--brand)' })
    // parseThemeTokens rejects the whole object on any invalid hex → {}.
    expect(tokens).toEqual({})
  })
})
