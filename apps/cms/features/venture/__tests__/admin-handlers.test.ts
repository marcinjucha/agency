/**
 * Tests for the venture bonus-funnel ADMIN CRUD handlers (iter 5a).
 *
 * Targets the pure handlers in admin-handlers.server.ts directly (not the
 * createServerFn RPC pipeline) — same pattern as docforge-licenses tests.
 *
 * What MUST be correct (per spec): no cross-tenant write via a forged parent id,
 * permission-gated mutations, and update schemas that never drop required ids.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
import { messages } from '@/lib/messages'

vi.mock('@/lib/server-auth.server', () => ({
  requireAuthContextFull: vi.fn(),
}))

import { requireAuthContextFull } from '@/lib/server-auth.server'
import {
  createBonusHandler,
  createCampaignHandler,
  createClientHandler,
  deleteCampaignHandler,
  listBonusesHandler,
  listCampaignsHandler,
  listClientsHandler,
  reorderBonusesHandler,
  updateCampaignHandler,
} from '../admin-handlers.server'
import {
  updateCampaignSchema,
  updateCampaignInputSchema,
} from '../validation'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const ALL_PERMS = ['bonus_funnel.clients', 'bonus_funnel.campaigns', 'bonus_funnel.bonuses']

/**
 * Build an auth context whose supabase client returns a fresh mockChain per
 * table, keyed by table name, using the supplied per-table final values.
 * Exposes the chains so tests can assert the filters that were applied.
 */
function setupAuth(
  tableResults: Record<string, unknown>,
  permissions: string[] = ALL_PERMS,
) {
  const chains: Record<string, ReturnType<typeof mockChain>> = {}
  const from = vi.fn((name: string) => {
    if (!chains[name]) {
      chains[name] = mockChain(tableResults[name] ?? { data: null, error: null })
    }
    return chains[name]
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
  return { from, chains }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// Permission gating
// ===========================================================================

describe('permission gating', () => {
  it('rejects createClient without bonus_funnel.clients', async () => {
    const { from } = setupAuth({}, ['bonus_funnel.campaigns']) // wrong perm

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Gate short-circuits BEFORE any DB access.
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects createCampaign without bonus_funnel.campaigns', async () => {
    const { from } = setupAuth({}, ['bonus_funnel.clients'])

    const result = await createCampaignHandler({
      client_id: '11111111-1111-1111-1111-111111111111',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      published: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('grants when the parent permission (bonus_funnel) is held via prefix match', async () => {
    setupAuth(
      { so_clients: { data: [{ id: 'c1', name: 'K', slug: 'k', tenant_id: TENANT }], error: null } },
      ['bonus_funnel'], // parent grants all children
    )

    const result = await listClientsHandler()

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Tenant scoping
// ===========================================================================

describe('tenant scoping', () => {
  it('listClients scopes the query to the caller tenant', async () => {
    const { chains } = setupAuth({
      so_clients: { data: [], error: null },
    })

    await listClientsHandler()

    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('createClient injects tenant_id from auth, never from input', async () => {
    const row = { id: 'c1', name: 'Kacper', slug: 'kacper', tenant_id: TENANT }
    const { chains } = setupAuth({ so_clients: { data: row, error: null } })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(true)
    expect(chains.so_clients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT }),
    )
  })
})

// ===========================================================================
// Parent-ownership verification (no cross-tenant write via forged parent id)
// ===========================================================================

describe('parent-ownership verification', () => {
  it('createCampaign rejects a client_id belonging to another tenant', async () => {
    // assertClientOwned scopes so_clients by tenant_id → foreign client returns null.
    const { chains } = setupAuth({
      so_clients: { data: null, error: null },
    })

    const result = await createCampaignHandler({
      client_id: '22222222-2222-2222-2222-222222222222',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      published: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Ownership check is scoped to the tenant AND never reaches the insert.
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.so_campaigns).toBeUndefined()
  })

  it('createCampaign inserts when the client belongs to the tenant', async () => {
    const campaignRow = { id: 'camp-1', client_id: 'c1', slug: 'launch' }
    const { chains } = setupAuth({
      so_clients: { data: { id: 'c1' }, error: null },
      so_campaigns: { data: campaignRow, error: null },
    })

    const result = await createCampaignHandler({
      client_id: 'c1',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      published: false,
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual(campaignRow)
    expect(chains.so_campaigns.insert).toHaveBeenCalled()
  })

  it('createBonus rejects a campaign whose client is in another tenant', async () => {
    // campaign resolves (has client_id) but that client is NOT in the tenant.
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'foreign-client' }, error: null },
      so_clients: { data: null, error: null }, // foreign client → not owned
    })

    const result = await createBonusHandler({
      campaign_id: '33333333-3333-3333-3333-333333333333',
      title: 'Bonus',
      type: 'link',
      sort_order: 0,
      published: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.so_bonuses).toBeUndefined() // never inserted
  })

  it('updateCampaign rejects an id whose campaign is not in the tenant', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: null, error: null }, // campaign not found / not visible
    })

    const result = await updateCampaignHandler('44444444-4444-4444-4444-444444444444', {
      slug: 'renamed',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('deleteCampaign verifies ownership before deleting', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await deleteCampaignHandler('camp-1')

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.delete).toHaveBeenCalled()
  })
})

// ===========================================================================
// Bonuses
// ===========================================================================

describe('bonuses', () => {
  it('listBonuses scopes to the campaign after verifying ownership', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
      so_bonuses: { data: [{ id: 'b1', sort_order: 0 }], error: null },
    })

    const result = await listBonusesHandler('camp-1')

    expect(result.success).toBe(true)
    expect(chains.so_bonuses.eq).toHaveBeenCalledWith('campaign_id', 'camp-1')
    expect(chains.so_bonuses.order).toHaveBeenCalledWith('sort_order', { ascending: true })
  })

  it('reorderBonuses rejects when an item id does not belong to the campaign', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
      // only one of the two requested ids belongs to the campaign
      so_bonuses: { data: [{ id: 'b1' }], error: null },
    })

    const result = await reorderBonusesHandler({
      campaign_id: 'camp-1',
      items: [
        { id: '55555555-5555-5555-5555-555555555555', sort_order: 0 },
        { id: '66666666-6666-6666-6666-666666666666', sort_order: 1 },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.so_bonuses.update).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// DB-error mapping (LOW finding, iter 5a): raw Supabase/Postgres error strings
// must NOT reach the client — 23505 → friendly slug message, other DB errors →
// generic. The raw error is logged via console.error (developer-facing).
// ===========================================================================

describe('db-error mapping (no raw error leak)', () => {
  it('createClient maps a 23505 unique_violation to the friendly slug message', async () => {
    const rawDbMessage =
      'duplicate key value violates unique constraint "so_clients_tenant_slug_key"'
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth({
      so_clients: { data: null, error: { code: '23505', message: rawDbMessage } },
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.slugTaken)
    // The raw Postgres/constraint string never reaches the client.
    expect(result.error).not.toContain('constraint')
    // …but it IS logged for developers.
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('createCampaign maps a 23505 (slug taken for this client) to the friendly slug message', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth({
      so_clients: { data: { id: 'c1' }, error: null }, // parent owned → proceeds to insert
      so_campaigns: {
        data: null,
        error: { code: '23505', message: 'duplicate key value ... so_campaigns_client_id_slug_key' },
      },
    })

    const result = await createCampaignHandler({
      client_id: 'c1',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      published: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.slugTaken)
    consoleSpy.mockRestore()
  })

  it('createClient maps a non-unique DB error to a generic message (raw string hidden)', async () => {
    const rawRlsMessage =
      'new row violates row-level security policy for table "so_clients"'
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth({
      so_clients: { data: null, error: { code: '42501', message: rawRlsMessage } },
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.operationFailed)
    expect(result.error).not.toContain('row-level security')
    consoleSpy.mockRestore()
  })
})

// ===========================================================================
// Update schemas never drop required ids (features/CLAUDE.md gotcha)
// ===========================================================================

describe('update schema id-drop protection', () => {
  it('updateCampaignInputSchema rejects a missing row id', () => {
    const parsed = updateCampaignInputSchema.safeParse({ data: { slug: 'renamed' } })
    expect(parsed.success).toBe(false)
  })

  it('updateCampaignSchema strips the FK client_id (cannot be reparented)', () => {
    const parsed = updateCampaignSchema.parse({
      client_id: '77777777-7777-7777-7777-777777777777',
      slug: 'renamed',
    })
    expect(parsed).not.toHaveProperty('client_id')
    expect(parsed.slug).toBe('renamed')
  })

  it('updateCampaignSchema accepts an empty partial (no fields required)', () => {
    expect(updateCampaignSchema.safeParse({}).success).toBe(true)
  })
})

// ===========================================================================
// Secret never selected by the authenticated client (defense-in-depth).
// SELECT on so_campaigns.tally_webhook_secret is revoked from `authenticated`
// at the DB layer, so every admin campaign read/write must project an EXPLICIT
// column list that omits it (a bare select('*') would hit "permission denied
// for column tally_webhook_secret"). These lock that invariant against drift.
// ===========================================================================

describe('admin campaign selects never include the plaintext secret', () => {
  const selectArgs = (chain: { select: { mock: { calls: unknown[][] } } }): string[] =>
    chain.select.mock.calls.map((c) => String(c[0] ?? ''))

  it('listCampaigns projects explicit columns without tally_webhook_secret', async () => {
    const { chains } = setupAuth({
      so_clients: { data: [{ id: 'c1' }], error: null },
      so_campaigns: { data: [], error: null },
    })

    await listCampaignsHandler()

    const args = selectArgs(chains.so_campaigns)
    expect(args.length).toBeGreaterThan(0)
    for (const a of args) {
      expect(a).not.toBe('*')
      expect(a).not.toContain('tally_webhook_secret')
    }
    expect(args.some((a) => a.includes('has_webhook_secret'))).toBe(true)
  })

  it('createCampaign returns an explicit projection without tally_webhook_secret', async () => {
    const { chains } = setupAuth({
      so_clients: { data: { id: 'c1' }, error: null },
      so_campaigns: { data: { id: 'camp-1', client_id: 'c1', slug: 'launch' }, error: null },
    })

    await createCampaignHandler({
      client_id: 'c1',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      published: false,
    })

    for (const a of selectArgs(chains.so_campaigns)) {
      expect(a).not.toBe('*')
      expect(a).not.toContain('tally_webhook_secret')
    }
    expect(selectArgs(chains.so_campaigns).some((a) => a.includes('has_webhook_secret'))).toBe(true)
  })

  it('updateCampaign returns an explicit projection without tally_webhook_secret', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1', id: 'camp-1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    await updateCampaignHandler('camp-1', { slug: 'renamed' })

    // Includes the ownership-check select('client_id') AND the result projection —
    // NEITHER may reference the secret.
    for (const a of selectArgs(chains.so_campaigns)) {
      expect(a).not.toBe('*')
      expect(a).not.toContain('tally_webhook_secret')
    }
    expect(selectArgs(chains.so_campaigns).some((a) => a.includes('has_webhook_secret'))).toBe(true)
  })
})
