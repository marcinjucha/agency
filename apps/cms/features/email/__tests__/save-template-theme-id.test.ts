import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AuthContext } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// saveTemplate — theme_id absent-vs-null semantics (2026-07-14 fix).
//
// The editor sends theme_id on every save (string | null), but a partial /
// legacy payload may OMIT the field. `undefined` (absent) must PRESERVE the
// stored theme_id; explicit `null` must CLEAR it (inherit the tenant). Before
// the fix the caller coalesced `theme_id ?? null`, so any save omitting the
// field silently wiped a per-template theme and re-baked with the tenant
// default. We assert the persisted payload's theme_id for each case.
//
// The theme resolve + render are mocked (no real @react-email / DB) so the test
// targets ONLY the theme_id decision + the update payload.
// ---------------------------------------------------------------------------

vi.mock('../render.server', () => ({
  renderEmailBlocks: vi.fn(async () => '<html>baked</html>'),
  DEFAULT_BLOCKS: [],
}))

vi.mock('../utils/resolve-tenant-theme.server', () => ({
  resolveEmailThemeMap: vi.fn(async () => ({})),
}))

import { saveTemplate } from '../server'
import { resolveEmailThemeMap } from '../utils/resolve-tenant-theme.server'

const TENANT = 'tenant-1'

/**
 * Minimal supabase mock. `email_templates` select→maybeSingle returns the
 * existing row (id + stored theme_id); update captures the payload. so_themes
 * (only hit when a non-null string theme_id is passed) reuses the same builder
 * and resolves as "owned".
 */
function makeAuth(existingThemeId: string | null) {
  const updatePayloads: Array<Record<string, unknown>> = []
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() =>
      Promise.resolve({ data: { id: 'row-1', theme_id: existingThemeId }, error: null }),
    ),
    update: vi.fn((payload: Record<string, unknown>) => {
      updatePayloads.push(payload)
      return { eq: vi.fn(() => Promise.resolve({ error: null })) }
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      updatePayloads.push(payload)
      return Promise.resolve({ error: null })
    }),
  }
  const from = vi.fn(() => builder)
  const auth = { supabase: { from }, tenantId: TENANT, userId: 'u1' } as unknown as AuthContext
  return { auth, updatePayloads }
}

const BLOCKS = [{ id: 'b1', type: 'text', content: '<p>hi</p>' }] as never

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveTemplate — theme_id preserve vs clear', () => {
  it('theme_id ABSENT (undefined) PRESERVES the stored theme_id', async () => {
    const { auth, updatePayloads } = makeAuth('theme-existing')

    const result = await saveTemplate(auth, 'welcome', 'Subj', BLOCKS, undefined)

    expect(result.isOk()).toBe(true)
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].theme_id).toBe('theme-existing')
    // The re-bake uses the PRESERVED theme, not the tenant default.
    expect(resolveEmailThemeMap).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateThemeId: 'theme-existing' }),
    )
  })

  it('theme_id explicit NULL CLEARS the theme (inherit the tenant)', async () => {
    const { auth, updatePayloads } = makeAuth('theme-existing')

    const result = await saveTemplate(auth, 'welcome', 'Subj', BLOCKS, null)

    expect(result.isOk()).toBe(true)
    expect(updatePayloads[0].theme_id).toBeNull()
    expect(resolveEmailThemeMap).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateThemeId: null }),
    )
  })

  it('theme_id explicit STRING sets that per-template theme', async () => {
    const { auth, updatePayloads } = makeAuth('theme-existing')

    const result = await saveTemplate(auth, 'welcome', 'Subj', BLOCKS, 'theme-new')

    expect(result.isOk()).toBe(true)
    expect(updatePayloads[0].theme_id).toBe('theme-new')
  })
})
