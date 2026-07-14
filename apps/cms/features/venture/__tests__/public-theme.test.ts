import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// Mock the SERVICE client factory — resolvePublicCampaignTheme runs on the
// service client (RLS bypass) but with a DEDICATED, NON-SECRET theme projection.
// We mock the factory and assert the EXACT column lists it selects.
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '@/lib/supabase/service'
import { HALO_EFEKT_DEFAULT } from '@/lib/theme'
import {
  resolvePublicCampaignTheme,
  PUBLIC_CAMPAIGN_THEME_COLUMNS,
  PUBLIC_CLIENT_THEME_COLUMNS,
  PUBLIC_TENANT_THEME_COLUMNS,
} from '../public-theme.server'

type Row = Record<string, unknown> | null

function makeBuilder(resolver: (id: string | undefined) => Row) {
  let lastId: string | undefined
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((_col: string, val: string) => {
      lastId = val
      return builder
    }),
    maybeSingle: vi.fn(() => Promise.resolve({ data: resolver(lastId), error: null })),
  }
  return builder
}

interface SetupOpts {
  campaign?: Row
  client?: Row
  tenant?: Row
  // so_themes rows keyed by theme id.
  themesById?: Record<string, Row>
}

function setup(opts: SetupOpts) {
  const campaignBuilder = makeBuilder(() => opts.campaign ?? null)
  const clientBuilder = makeBuilder(() => opts.client ?? null)
  const tenantBuilder = makeBuilder(() => opts.tenant ?? null)
  const themesBuilder = makeBuilder((id) => (id ? (opts.themesById?.[id] ?? null) : null))

  const from = vi.fn((table: string) => {
    if (table === 'so_campaigns') return campaignBuilder
    if (table === 'so_clients') return clientBuilder
    if (table === 'tenants') return tenantBuilder
    return themesBuilder // so_themes
  })
  ;(createServiceClient as Mock).mockReturnValue({ from })
  return { from, campaignBuilder, clientBuilder, tenantBuilder, themesBuilder }
}

// A distinctive fully-populated tokens blob (all 9 colour tokens valid hex).
function tokens(primary: string) {
  return {
    primary,
    primaryText: '#ffffff',
    accent: '#00e5ff',
    background: '#ffffff',
    text: '#222222',
    mutedText: '#666666',
    headerBackground: '#000000',
    headerText: '#ffffff',
    footerText: '#999999',
    logoUrl: 'https://cdn.example.com/logo.png',
    fontFamily: 'Inter',
  }
}

const RESOLVED_KEYS = new Set([
  'primary',
  'primaryText',
  'accent',
  'background',
  'text',
  'mutedText',
  'headerBackground',
  'headerText',
  'footerText',
  'logoUrl',
  'fontFamily',
])

beforeEach(() => {
  ;(createServiceClient as Mock).mockReset()
})

describe('resolvePublicCampaignTheme — secret-exclusion boundary (CRITICAL)', () => {
  it('so_clients select lists ONLY theme_id/theme/tenant_id — never a secret column', async () => {
    const mock = setup({
      client: { theme_id: null, theme: null, tenant_id: null },
    })

    await resolvePublicCampaignTheme('campaign-1', 'client-1')

    // Exact non-secret projection.
    expect(mock.clientBuilder.select).toHaveBeenCalledWith(PUBLIC_CLIENT_THEME_COLUMNS)

    // The client projection must contain NONE of the secret columns.
    expect(PUBLIC_CLIENT_THEME_COLUMNS).not.toMatch(/resend_api_key/)
    expect(PUBLIC_CLIENT_THEME_COLUMNS).not.toMatch(/gmail_app_password/)
    expect(PUBLIC_CLIENT_THEME_COLUMNS).not.toMatch(/gmail_/)
    expect(PUBLIC_CLIENT_THEME_COLUMNS).not.toMatch(/resend_/)

    // No secret column string appears in ANY select across all tables.
    const allSelectArgs = [
      ...mock.campaignBuilder.select.mock.calls,
      ...mock.clientBuilder.select.mock.calls,
      ...mock.tenantBuilder.select.mock.calls,
      ...mock.themesBuilder.select.mock.calls,
    ]
      .flat()
      .join(' ')
    expect(allSelectArgs).not.toMatch(/resend_api_key/)
    expect(allSelectArgs).not.toMatch(/gmail_app_password/)
    expect(allSelectArgs).not.toMatch(/gmail_/)
    expect(allSelectArgs).not.toMatch(/resend_/)

    // Guard the exported projections directly too.
    expect(PUBLIC_CAMPAIGN_THEME_COLUMNS).toBe('theme_id, brand')
    expect(PUBLIC_TENANT_THEME_COLUMNS).toBe('theme_id, theme')
  })

  it('returns ONLY ResolvedTheme keys — no secret key is reachable in the output', async () => {
    // Real resolve path with a fully-populated named theme (incl logoUrl/font).
    setup({
      campaign: { theme_id: 'theme-campaign', brand: null },
      client: { theme_id: null, theme: null, tenant_id: 'tenant-1' },
      tenant: { theme_id: null, theme: null },
      themesById: { 'theme-campaign': { tokens: tokens('#abcabc') } },
    })

    const result = (await resolvePublicCampaignTheme(
      'campaign-1',
      'client-1',
    )) as Record<string, unknown>

    // Every returned key belongs to the ResolvedTheme surface (9 tokens +
    // logoUrl/fontFamily) — nothing else (no secret, no tenant_id, no brand).
    for (const key of Object.keys(result)) {
      expect(RESOLVED_KEYS.has(key)).toBe(true)
    }
    expect(result).not.toHaveProperty('resend_api_key')
    expect(result).not.toHaveProperty('gmail_app_password')
    expect(result).not.toHaveProperty('tenant_id')
  })
})

describe('resolvePublicCampaignTheme — 3-tier resolution', () => {
  it('campaign theme_id → its named tokens win over client + tenant', async () => {
    setup({
      campaign: { theme_id: 'theme-campaign', brand: null },
      client: { theme_id: 'theme-client', theme: null, tenant_id: 'tenant-1' },
      tenant: { theme_id: 'theme-tenant', theme: null },
      themesById: {
        'theme-campaign': { tokens: tokens('#aa0000') },
        'theme-client': { tokens: tokens('#00bb00') },
        'theme-tenant': { tokens: tokens('#0000cc') },
      },
    })

    const theme = await resolvePublicCampaignTheme('campaign-1', 'client-1')

    expect(theme.primary).toBe('#aa0000')
  })

  it('campaign brand-only (no theme_id) → adapted brand colours the theme', async () => {
    setup({
      campaign: { theme_id: null, brand: { primary: '#abcdef', logo_url: 'https://cdn.x/l.png' } },
      client: { theme_id: null, theme: null, tenant_id: 'tenant-1' },
      tenant: { theme_id: null, theme: null },
    })

    const theme = await resolvePublicCampaignTheme('campaign-1', 'client-1')

    expect(theme.primary).toBe('#abcdef')
    expect(theme.logoUrl).toBe('https://cdn.x/l.png')
  })

  it('no campaign theme → falls to client → tenant', async () => {
    setup({
      campaign: { theme_id: null, brand: null },
      client: { theme_id: null, theme: tokens('#123456'), tenant_id: 'tenant-1' },
      tenant: { theme_id: null, theme: tokens('#654321') },
    })

    const theme = await resolvePublicCampaignTheme('campaign-1', 'client-1')

    // Client tier carries an override → wins over tenant.
    expect(theme.primary).toBe('#123456')
  })

  it('no theme anywhere → HALO_EFEKT_DEFAULT', async () => {
    setup({
      campaign: { theme_id: null, brand: null },
      client: { theme_id: null, theme: null, tenant_id: 'tenant-1' },
      tenant: { theme_id: null, theme: null },
    })

    const theme = await resolvePublicCampaignTheme('campaign-1', 'client-1')

    expect(theme).toEqual(HALO_EFEKT_DEFAULT)
  })

  it('never throws — a service-client failure degrades to HALO_EFEKT_DEFAULT', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(createServiceClient as Mock).mockImplementation(() => {
      throw new Error('service client boom')
    })

    const theme = await resolvePublicCampaignTheme('campaign-1', 'client-1')

    expect(theme).toEqual(HALO_EFEKT_DEFAULT)
    spy.mockRestore()
  })
})
