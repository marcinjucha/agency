import { describe, it, expect, vi, type Mock } from 'vitest'

// Mock the ANON server client — the whole point of this endpoint is that it
// runs on anon (RLS-enforced), never service-role. We mock the client factory
// and assert the exact column projections it is asked for.
vi.mock('@/lib/supabase/anon.server', () => ({
  createAnonServerClient: vi.fn(),
}))

import { createAnonServerClient } from '@/lib/supabase/anon.server'
import {
  getPublishedCampaignBySlug,
  CAMPAIGN_PUBLIC_COLUMNS,
  BONUS_PUBLIC_COLUMNS,
} from '../server'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

function makeCampaignBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

function makeBonusesBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

function setupClient(opts: { campaign: QueryResult; bonuses?: QueryResult }) {
  const campaignBuilder = makeCampaignBuilder(opts.campaign)
  const bonusesBuilder = makeBonusesBuilder(
    opts.bonuses ?? { data: [], error: null },
  )
  const from = vi.fn((table: string) =>
    table === 'so_campaigns' ? campaignBuilder : bonusesBuilder,
  )
  ;(createAnonServerClient as Mock).mockReturnValue({ from })
  return { from, campaignBuilder, bonusesBuilder }
}

const BRAND = {
  primary: '#111111',
  accent: '#00E5FF',
  bg: '#000000',
  logo_url: 'https://cdn.example.com/logo.png',
  font: 'Inter',
}

describe('getPublishedCampaignBySlug', () => {
  it('returns the contract shape for a published campaign with bonuses sorted by the DB', async () => {
    const mock = setupClient({
      campaign: {
        data: {
          id: 'campaign-1',
          slug: 'kacper',
          display_name: 'Kacper Launch',
          brand: BRAND,
        },
        error: null,
      },
      bonuses: {
        data: [
          { title: 'Bonus 1', description: 'first', type: 'link', url: 'https://a' },
          { title: 'Bonus 2', description: 'second', type: 'file', url: 'https://b' },
        ],
        error: null,
      },
    })

    const result = await getPublishedCampaignBySlug('kacper')

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({
      slug: 'kacper',
      display_name: 'Kacper Launch',
      brand: BRAND,
      bonuses: [
        { title: 'Bonus 1', description: 'first', type: 'link', url: 'https://a' },
        { title: 'Bonus 2', description: 'second', type: 'file', url: 'https://b' },
      ],
    })

    // Sorting is delegated to the DB (index-backed), not done in JS.
    expect(mock.bonusesBuilder.order).toHaveBeenCalledWith('sort_order', {
      ascending: true,
    })
    // Bonuses scoped to the campaign + published only.
    expect(mock.bonusesBuilder.eq).toHaveBeenCalledWith('campaign_id', 'campaign-1')
    expect(mock.bonusesBuilder.eq).toHaveBeenCalledWith('published', true)
  })

  it('defaults brand to {} and bonuses to [] when the campaign has none', async () => {
    setupClient({
      campaign: {
        data: { id: 'c2', slug: 'empty', display_name: null, brand: null },
        error: null,
      },
      bonuses: { data: [], error: null },
    })

    const result = await getPublishedCampaignBySlug('empty')

    expect(result._unsafeUnwrap()).toEqual({
      slug: 'empty',
      display_name: null,
      brand: {},
      bonuses: [],
    })
  })

  it('returns null (→ 404) when no row is visible to anon (missing OR unpublished)', async () => {
    const mock = setupClient({ campaign: { data: null, error: null } })

    const result = await getPublishedCampaignBySlug('does-not-exist')

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toBeNull()
    // Short-circuits — never queries bonuses when the campaign is invisible.
    expect(mock.bonusesBuilder.order).not.toHaveBeenCalled()
  })

  it('propagates a genuine DB error as err (→ 500), not null', async () => {
    setupClient({
      campaign: { data: null, error: { message: 'connection reset' } },
    })

    const result = await getPublishedCampaignBySlug('kacper')

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe('connection reset')
  })

  it('NEVER selects lead / esp_* columns — only the public-safe projections', async () => {
    const mock = setupClient({
      campaign: {
        data: { id: 'c1', slug: 'kacper', display_name: 'K', brand: BRAND },
        error: null,
      },
      bonuses: { data: [], error: null },
    })

    await getPublishedCampaignBySlug('kacper')

    // Exact column lists requested.
    expect(mock.campaignBuilder.select).toHaveBeenCalledWith(CAMPAIGN_PUBLIC_COLUMNS)
    expect(mock.bonusesBuilder.select).toHaveBeenCalledWith(BONUS_PUBLIC_COLUMNS)

    // Never touches the isolation-critical tables.
    const tablesQueried = mock.from.mock.calls.map((c) => c[0])
    expect(tablesQueried).not.toContain('so_leads')
    expect(tablesQueried).not.toContain('so_esp_sync_log')

    // No esp_* / lead columns anywhere in the select strings.
    const allSelectArgs = [
      ...mock.campaignBuilder.select.mock.calls,
      ...mock.bonusesBuilder.select.mock.calls,
    ]
      .flat()
      .join(' ')
    expect(allSelectArgs).not.toMatch(/esp_/)
    expect(allSelectArgs).not.toMatch(/lead/)
    expect(allSelectArgs).not.toMatch(/client_id/)

    // Guard the exported constants directly too.
    expect(CAMPAIGN_PUBLIC_COLUMNS).not.toMatch(/esp_/)
    expect(CAMPAIGN_PUBLIC_COLUMNS).not.toMatch(/client_id/)
  })
})
