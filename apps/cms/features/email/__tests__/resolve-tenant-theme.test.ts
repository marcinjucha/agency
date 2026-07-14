import { describe, it, expect, vi } from 'vitest'
// WHY the relative import (not `@agency/email`): this worktree SHARES its
// node_modules with the main checkout, so `@agency/email` resolves to
// `legal-mind/packages/email` (main branch) which does NOT yet have the Iter-B
// theme-aware renderer. Importing the worktree's OWN renderer via relative path
// exercises the actual branch code (CI/prod build from the branch resolves it
// correctly). See CLAUDE.md "pnpm worktree + main share node_modules".
import { renderEmailBlocks } from '../../../../../packages/email/src/EmailRenderer'
import type { Block } from '@agency/email'
import { HALO_EFEKT_DEFAULT } from '@/lib/theme'
import {
  resolveEmailThemeMap,
  resolveTenantThemeMap,
} from '../utils/resolve-tenant-theme.server'
import type { StartClient } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// resolveTenantThemeMap — DB → flat ThemeColorMap, never-throw + fail-open.
//
// Supabase mock: resolveTenantThemeMap makes EXACTLY one `.from('tenants')` call
// (`.select().eq().maybeSingle()`). Each test builds a single-`.from()` mock.
// ---------------------------------------------------------------------------

function mockSupabase(result: { data: unknown; error: unknown }): StartClient {
  const maybeSingle = vi.fn(() => Promise.resolve(result))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from } as unknown as StartClient
}

describe('resolveTenantThemeMap', () => {
  it('maps a stored tenant theme token to its hex', async () => {
    const supabase = mockSupabase({ data: { theme: { primary: '#aa0000' } }, error: null })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')
    expect(map.primary).toBe('#aa0000')
  })

  it('backfills missing tokens from HALO_EFEKT_DEFAULT (empty theme)', async () => {
    const supabase = mockSupabase({ data: { theme: {} }, error: null })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')
    expect(map.primary).toBe(HALO_EFEKT_DEFAULT.primary)
    expect(map.text).toBe(HALO_EFEKT_DEFAULT.text)
  })

  it('falls back to the default when the tenant row is missing (null)', async () => {
    const supabase = mockSupabase({ data: null, error: null })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')
    expect(map.primary).toBe(HALO_EFEKT_DEFAULT.primary)
  })

  it('never throws on a DB error — degrades to the default map', async () => {
    const supabase = mockSupabase({ data: null, error: { message: 'boom' } })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')
    expect(map.primary).toBe(HALO_EFEKT_DEFAULT.primary)
  })

  it('sanitises a non-hex token value (var()) to the default at the boundary', async () => {
    const supabase = mockSupabase({ data: { theme: { primary: 'var(--brand)' } }, error: null })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')
    // parseThemeTokens rejects non-hex → token unset → backfilled from default.
    expect(map.primary).toBe(HALO_EFEKT_DEFAULT.primary)
    expect(map.primary).not.toContain('var(')
  })
})

// ---------------------------------------------------------------------------
// resolveEmailThemeMap — per-template override precedence over the tenant theme.
//
// Two tables: `tenants` (theme_id, theme) then `so_themes` (tokens) when an
// effective theme_id resolves. Precedence lives in id-selection:
//   effectiveThemeId = templateThemeId ?? tenantRow.theme_id
// A template theme_id suppresses the inline `tenants.theme` fallback.
// ---------------------------------------------------------------------------

type Res = { data: unknown; error: unknown }

function mockDb(cfg: { tenant?: Res; theme?: Res }): StartClient {
  const tenantChain = {
    maybeSingle: vi.fn(() => Promise.resolve(cfg.tenant ?? { data: null, error: null })),
  }
  const themeChain = {
    maybeSingle: vi.fn(() => Promise.resolve(cfg.theme ?? { data: null, error: null })),
  }
  const from = vi.fn((table: string) => {
    if (table === 'tenants') return { select: () => ({ eq: () => tenantChain }) }
    if (table === 'so_themes') return { select: () => ({ eq: () => themeChain }) }
    throw new Error(`unexpected table ${table}`)
  })
  return { from } as unknown as StartClient
}

describe('resolveEmailThemeMap', () => {
  it('uses the TEMPLATE theme (so_themes.tokens) when templateThemeId is set — wins over tenant', async () => {
    const supabase = mockDb({
      // tenant carries its OWN theme — must be ignored when a template theme is set.
      tenant: { data: { theme_id: 'tenant-theme', theme: { primary: '#00ff00' } }, error: null },
      theme: { data: { tokens: { primary: '#123456' } }, error: null },
    })
    const map = await resolveEmailThemeMap(supabase, {
      tenantId: 'tenant-1',
      templateThemeId: 'tmpl-theme',
    })
    expect(map.primary).toBe('#123456')
    expect(map.primary).not.toBe('#00ff00')
  })

  it('falls back to the TENANT theme when templateThemeId is null', async () => {
    const supabase = mockDb({
      tenant: { data: { theme_id: null, theme: { primary: '#aa0000' } }, error: null },
    })
    const map = await resolveEmailThemeMap(supabase, {
      tenantId: 'tenant-1',
      templateThemeId: null,
    })
    expect(map.primary).toBe('#aa0000')
  })

  it('is BYTE-IDENTICAL to resolveTenantThemeMap when both are null and tenant has no theme', async () => {
    const supabase = mockDb({ tenant: { data: null, error: null } })
    const viaEmail = await resolveEmailThemeMap(supabase, {
      tenantId: 'tenant-1',
      templateThemeId: null,
    })
    const viaTenant = await resolveTenantThemeMap(
      mockDb({ tenant: { data: null, error: null } }),
      'tenant-1',
    )
    // Both degrade to the neutral Halo Efekt default — pins the client-theming
    // guarantee that the tenant-default path is unchanged by the new seam.
    expect(viaEmail).toEqual(viaTenant)
    expect(viaEmail.primary).toBe(HALO_EFEKT_DEFAULT.primary)
    expect(viaEmail.text).toBe(HALO_EFEKT_DEFAULT.text)
  })

  it('does NOT fall back to the tenant inline theme when a named template theme is missing', async () => {
    const supabase = mockDb({
      // tenant has an inline theme, but a template theme_id is set → inline is suppressed.
      tenant: { data: { theme_id: null, theme: { primary: '#aa0000' } }, error: null },
      // named theme row not found → parseThemeTokens(null) → default backfill.
      theme: { data: null, error: null },
    })
    const map = await resolveEmailThemeMap(supabase, {
      tenantId: 'tenant-1',
      templateThemeId: 'tmpl-theme',
    })
    expect(map.primary).toBe(HALO_EFEKT_DEFAULT.primary)
    expect(map.primary).not.toBe('#aa0000')
  })
})

// ---------------------------------------------------------------------------
// End-to-end: resolved map → renderEmailBlocks bakes the hex into html_body.
// The SAME renderer + SAME map the save/preview paths use, so this proves the
// wiring's payoff (createServerFn RPC layer is not exercised — no test harness
// for it in this repo).
// ---------------------------------------------------------------------------

describe('theme map baked into rendered html_body', () => {
  it('a block with textColorToken resolves to the tenant hex in the HTML', async () => {
    const supabase = mockSupabase({ data: { theme: { primary: '#aa0000' } }, error: null })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')

    const blocks: Block[] = [{ id: 'a', type: 'text', content: '<p>Hello</p>', textColorToken: 'primary' }]
    const html = await renderEmailBlocks(blocks, map)
    expect(html).toContain('color:#aa0000')
  })

  it('empty/missing tenant theme → block renders with the default hex', async () => {
    const supabase = mockSupabase({ data: { theme: {} }, error: null })
    const map = await resolveTenantThemeMap(supabase, 'tenant-1')

    const blocks: Block[] = [{ id: 'a', type: 'text', content: '<p>Hello</p>', textColorToken: 'primary' }]
    const html = await renderEmailBlocks(blocks, map)
    // primary backfilled from HALO_EFEKT_DEFAULT (#0f172a).
    expect(html).toContain(`color:${HALO_EFEKT_DEFAULT.primary}`)
  })

  it('produces byte-identical output to no-theme when no token fields are set', async () => {
    const blocks: Block[] = [{ id: 'a', type: 'text', content: '<p>Hello</p>' }]
    const withEmpty = await renderEmailBlocks(blocks, {})
    const withoutTheme = await renderEmailBlocks(blocks)
    expect(withEmpty).toBe(withoutTheme)
  })

  it('never leaks var()/hsl()/token names into html_body (renderer fail-open)', async () => {
    // A malformed theme map (non-hex values) reaches the renderer directly —
    // themedColor is fail-open, so the token resolves to nothing and the block
    // falls through to its hardcoded default. No var()/hsl()/token string survives.
    const badMap = { primary: 'var(--brand)', text: 'hsl(0,0%,0%)' }
    const blocks: Block[] = [
      { id: 'a', type: 'text', content: '<p>X</p>', textColorToken: 'primary' },
    ]
    const html = await renderEmailBlocks(blocks, badMap)
    expect(html).not.toContain('var(')
    expect(html).not.toContain('hsl(')
    expect(html).not.toContain('textColorToken')
  })
})
