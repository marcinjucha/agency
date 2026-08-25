/**
 * Duplicate-campaign handler: column grant compliance, forced fields, bonus
 * copy, and the compensating rollback.
 *
 * A bespoke mock rather than the shared `mockChain`: the flow hits so_campaigns
 * five times with five DIFFERENT results (ownership probe, source read, sibling
 * names, insert, rollback delete), which a one-value-per-table chain cannot
 * express.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { messages } from '@/lib/messages'

vi.mock('@/lib/server-auth.server', () => {
  const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])
  return {
    requireAuthContextFull: vi.fn(),
    FULL_ACCESS_ROLES,
    isUnscopedActor: (actor: { isSuperAdmin: boolean; roleName: string | null }) =>
      actor.isSuperAdmin || FULL_ACCESS_ROLES.has(actor.roleName ?? ''),
  }
})

import { requireAuthContextFull } from '@/lib/server-auth.server'
import { duplicateCampaignHandler } from '../admin-handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const CLIENT = 'client-1'
const SOURCE = '11111111-1111-4111-8111-111111111111'
const COPY = '22222222-2222-4222-8222-222222222222'
const ALL_PERMS = ['bonus_funnel.clients', 'bonus_funnel.campaigns', 'bonus_funnel.bonuses']

type Step = { data?: unknown; error?: unknown }

interface Cfg {
  campaigns: Step[] // consumed in call order by from('so_campaigns')
  bonuses?: Step[]
  clients?: Step
}

function setup(cfg: Cfg, permissions: string[] = ALL_PERMS) {
  const calls = {
    campaignSelects: [] as string[],
    bonusSelects: [] as string[],
    inserted: [] as unknown[],
    deleted: 0,
    from: [] as string[],
  }
  const queues: Record<string, Step[]> = {
    so_campaigns: [...cfg.campaigns],
    so_bonuses: [...(cfg.bonuses ?? [])],
  }

  const from = vi.fn((table: string) => {
    calls.from.push(table)
    const next = () => queues[table]?.shift() ?? { data: null, error: null }
    const settled = next()
    const value = { data: settled.data ?? null, error: settled.error ?? null }

    const chain: Record<string, unknown> = {
      select: (cols: string) => {
        if (table === 'so_campaigns') calls.campaignSelects.push(cols)
        if (table === 'so_bonuses') calls.bonusSelects.push(cols)
        return chain
      },
      insert: (rows: unknown) => {
        calls.inserted.push(rows)
        return chain
      },
      delete: () => {
        calls.deleted += 1
        return chain
      },
      eq: () => chain,
      order: () => chain,
      single: async () => value,
      maybeSingle: async () => value,
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(value).then(resolve),
    }
    if (table === 'so_clients') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: async () => cfg.clients ?? { data: { id: CLIENT }, error: null } }) }),
        }),
      }
    }
    return chain
  })

  mockRequireAuth.mockReturnValue(
    okAsync({
      supabase: { from },
      userId: 'user-1',
      tenantId: TENANT,
      isSuperAdmin: false,
      roleName: 'member',
      permissions,
    }),
  )
  return { from, calls }
}

const sourceRow = (over: Record<string, unknown> = {}) => ({
  data: {
    client_id: CLIENT,
    slug: 'warsztaty',
    display_name: 'Warsztaty',
    brand: { logo: 'x' },
    theme_id: 'theme-1',
    email_template_id: 'tpl-1',
    esp_provider: 'beehiiv',
    esp_tag_launch: 'launch-2026',
    lead_source_provider: 'tally',
    lead_source_config: { formId: 'abc' },
    template_variable_values: { bonus_1_url: 'https://x' },
    ...over,
  },
  error: null,
})

const copyRow = { data: { id: COPY, client_id: CLIENT, slug: 'warsztaty-kopia' }, error: null }

/** ownership probe → source read → sibling names → insert */
const happyCampaignQueue = (source = sourceRow(), siblings: unknown[] = []) => [
  { data: { client_id: CLIENT } },
  source,
  { data: siblings },
  copyRow,
]

beforeEach(() => vi.clearAllMocks())

describe('duplicateCampaignHandler — permission gating', () => {
  it('requires bonus_funnel.campaigns', async () => {
    const { from } = setup({ campaigns: [] }, ['bonus_funnel.bonuses'])
    const result = await duplicateCampaignHandler(SOURCE)

    expect(result).toMatchObject({ success: false, error: messages.common.noPermission })
    expect(from).not.toHaveBeenCalled()
  })

  it('ALSO requires bonus_funnel.bonuses — the copy writes so_bonuses rows', async () => {
    const { from } = setup({ campaigns: [] }, ['bonus_funnel.campaigns'])
    const result = await duplicateCampaignHandler(SOURCE)

    expect(result).toMatchObject({ success: false, error: messages.common.noPermission })
    expect(from).not.toHaveBeenCalled()
  })
})

describe('duplicateCampaignHandler — column grant', () => {
  it('never selects a column outside the authenticated GRANT', async () => {
    const { calls } = setup({ campaigns: happyCampaignQueue(), bonuses: [{ data: [] }] })
    await duplicateCampaignHandler(SOURCE)

    const projection = calls.campaignSelects.join(' ')
    expect(projection).not.toMatch(/tally_webhook_secret/)
    expect(projection).not.toMatch(/\*/)
    // The 17-column allowlist of 20260715120000:45-49.
    const granted = new Set([
      'id', 'client_id', 'slug', 'display_name', 'brand', 'esp_provider', 'esp_audience_ref',
      'esp_tag_launch', 'published', 'created_at', 'updated_at', 'has_webhook_secret',
      'lead_source_provider', 'lead_source_config', 'theme_id', 'email_template_id',
      'template_variable_values',
    ])
    for (const col of projection.split(/[\s,]+/).filter(Boolean)) {
      expect(granted.has(col)).toBe(true)
    }
  })
})

describe('duplicateCampaignHandler — payload', () => {
  it('forces the secret, audience and publish state instead of copying them', async () => {
    const { calls } = setup({ campaigns: happyCampaignQueue(), bonuses: [{ data: [] }] })
    await duplicateCampaignHandler(SOURCE)

    expect(calls.inserted[0]).toMatchObject({
      tally_webhook_secret: null,
      esp_audience_ref: null,
      published: false,
    })
  })

  it('carries brand, theme, template, variable values and the lead source', async () => {
    const { calls } = setup({ campaigns: happyCampaignQueue(), bonuses: [{ data: [] }] })
    await duplicateCampaignHandler(SOURCE)

    expect(calls.inserted[0]).toMatchObject({
      client_id: CLIENT,
      brand: { logo: 'x' },
      theme_id: 'theme-1',
      email_template_id: 'tpl-1',
      template_variable_values: { bonus_1_url: 'https://x' },
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-2026',
      lead_source_provider: 'tally',
    })
  })

  it('re-sanitizes lead_source_config, dropping a smuggled secret from an old row', async () => {
    const { calls } = setup({
      campaigns: happyCampaignQueue(
        sourceRow({ lead_source_config: { formId: 'abc', secret: 'leaked' } }),
      ),
      bonuses: [{ data: [] }],
    })
    await duplicateCampaignHandler(SOURCE)

    expect(calls.inserted[0]).toHaveProperty('lead_source_config')
    expect(JSON.stringify(calls.inserted[0])).not.toMatch(/leaked/)
  })

  it('uniquifies the slug and the display name against the client siblings', async () => {
    const { calls } = setup({
      campaigns: happyCampaignQueue(sourceRow(), [
        { slug: 'warsztaty', display_name: 'Warsztaty' },
        { slug: 'warsztaty-kopia', display_name: 'Warsztaty (kopia)' },
      ]),
      bonuses: [{ data: [] }],
    })
    await duplicateCampaignHandler(SOURCE)

    expect(calls.inserted[0]).toMatchObject({
      slug: 'warsztaty-kopia-2',
      display_name: 'Warsztaty (kopia 2)',
    })
  })

  it('rejects a source outside the tenant without an existence oracle', async () => {
    const { calls } = setup({ campaigns: [{ data: null }] })
    const result = await duplicateCampaignHandler(SOURCE)

    expect(result).toMatchObject({ success: false, error: messages.common.noPermission })
    expect(calls.inserted).toHaveLength(0)
  })
})

describe('duplicateCampaignHandler — bonuses', () => {
  it('copies bonuses in one insert, preserving order and publish state', async () => {
    const { calls } = setup({
      campaigns: happyCampaignQueue(),
      bonuses: [
        {
          data: [
            { title: 'Ebook', description: null, type: 'file', url: null, media_asset_id: 'm1', sort_order: 0, published: true },
            // A NULL title is representable in the table but rejected by
            // createBonusSchema — proof we copy raw rows, not validated input.
            { title: null, description: 'Bez tytułu', type: 'link', url: 'https://y', media_asset_id: null, sort_order: 1, published: false },
          ],
        },
        { error: null },
      ],
    })
    await duplicateCampaignHandler(SOURCE)

    const rows = calls.inserted[1] as Record<string, unknown>[]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ campaign_id: COPY, title: 'Ebook', sort_order: 0, published: true })
    expect(rows[1]).toMatchObject({ campaign_id: COPY, title: null, sort_order: 1, published: false })
  })

  it('skips the bonus insert entirely when the source has none', async () => {
    const { calls } = setup({ campaigns: happyCampaignQueue(), bonuses: [{ data: [] }] })
    const result = await duplicateCampaignHandler(SOURCE)

    expect(result.success).toBe(true)
    expect(calls.inserted).toHaveLength(1)
  })
})

describe('duplicateCampaignHandler — rollback', () => {
  it('deletes the new campaign when the bonus copy fails, and reports the bonus error', async () => {
    const { calls } = setup({
      campaigns: [...happyCampaignQueue(), { data: [{ id: COPY }] }], // rollback delete
      bonuses: [
        { data: [{ title: 'Ebook', description: null, type: 'file', url: null, media_asset_id: null, sort_order: 0, published: true }] },
        { error: { message: 'boom' } },
      ],
    })
    const result = await duplicateCampaignHandler(SOURCE)

    expect(calls.deleted).toBe(1)
    expect(result.success).toBe(false)
    expect(result.error).not.toBe(messages.venture.duplicatePartial)
  })

  it('reports duplicatePartial when the rollback itself removes nothing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { calls } = setup({
      campaigns: [...happyCampaignQueue(), { data: [] }], // delete matched zero rows
      bonuses: [
        { data: [{ title: 'Ebook', description: null, type: 'file', url: null, media_asset_id: null, sort_order: 0, published: true }] },
        { error: { message: 'boom' } },
      ],
    })
    const result = await duplicateCampaignHandler(SOURCE)

    expect(calls.deleted).toBe(1)
    expect(result).toMatchObject({ success: false, error: messages.venture.duplicatePartial })
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('orphan'), COPY)
    errorSpy.mockRestore()
  })
})
