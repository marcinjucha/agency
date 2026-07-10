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

vi.mock('@/lib/server-auth.server', () => {
  // Real value — the handlers' unscoped-actor guard uses this set (kept in parity
  // with the SQL role list). Stubbing it differently would defeat the guard under
  // test. isUnscopedActor is now the shared helper the handlers import, so the
  // mock provides a faithful implementation over the same set.
  const FULL_ACCESS_ROLES = new Set(['owner', 'admin'])
  return {
    requireAuthContextFull: vi.fn(),
    FULL_ACCESS_ROLES,
    isUnscopedActor: (actor: { isSuperAdmin: boolean; roleName: string | null }) =>
      actor.isSuperAdmin || FULL_ACCESS_ROLES.has(actor.roleName ?? ''),
  }
})

import { requireAuthContextFull } from '@/lib/server-auth.server'
import {
  createBonusHandler,
  createCampaignHandler,
  createClientHandler,
  deleteCampaignHandler,
  deleteClientHandler,
  listBonusesHandler,
  listCampaignsHandler,
  listClientsHandler,
  reorderBonusesHandler,
  updateCampaignHandler,
  updateClientHandler,
} from '../admin-handlers.server'
import {
  updateCampaignSchema,
  updateCampaignInputSchema,
} from '../validation'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const OTHER_TENANT = 'tenant-2'
const ALL_PERMS = ['bonus_funnel.clients', 'bonus_funnel.campaigns', 'bonus_funnel.bonuses']

/**
 * Build an auth context whose supabase client returns a fresh mockChain per
 * table, keyed by table name, using the supplied per-table final values.
 * Exposes the chains so tests can assert the filters that were applied.
 */
type Actor = { roleName?: string | null; isSuperAdmin?: boolean }

function setupAuth(
  tableResults: Record<string, unknown>,
  permissions: string[] = ALL_PERMS,
  actor: Actor = {},
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
      // Default actor = SCOPED member (role member, not super_admin). Tests that
      // exercise the unscoped-only create path override with an owner/admin/super.
      isSuperAdmin: actor.isSuperAdmin ?? false,
      roleName: actor.roleName === undefined ? 'member' : actor.roleName,
      permissions,
    }),
  )
  return { from, chains }
}

const OWNER: Actor = { roleName: 'owner', isSuperAdmin: false }

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

  it('listClients (super_admin) scopes to a PROVIDED other tenant (Scope Bar client list)', async () => {
    const { chains } = setupAuth(
      { so_clients: { data: [], error: null } },
      ALL_PERMS,
      { roleName: 'member', isSuperAdmin: true },
    )

    await listClientsHandler(OTHER_TENANT)

    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(chains.so_clients.eq).not.toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('listClients (NON-super) IGNORES a provided tenantId, forced to auth.tenantId (no cross-tenant read)', async () => {
    // KEY SECURITY TEST: a regular admin passing tenantId=<other> must NOT read
    // another tenant's client list.
    const { chains } = setupAuth(
      { so_clients: { data: [], error: null } },
      ALL_PERMS,
      { roleName: 'admin', isSuperAdmin: false },
    )

    await listClientsHandler(OTHER_TENANT)

    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.so_clients.eq).not.toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
  })

  it('createClient injects tenant_id from auth, never from input', async () => {
    const row = { id: 'c1', name: 'Kacper', slug: 'kacper', tenant_id: TENANT }
    const { chains } = setupAuth({ so_clients: { data: row, error: null } }, ALL_PERMS, OWNER)

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(true)
    expect(chains.so_clients.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT }),
    )
  })
})

// ===========================================================================
// createClient unscoped-actor guard (Task B / iter 2): app-layer defense over
// the so_clients INSERT WITH CHECK gate. Client creation is UNSCOPED-only —
// only super_admin or owner/admin (FULL_ACCESS_ROLES) may create a client. A
// scoped member is rejected cleanly with the standard no-permission message
// (never a raw RLS error), BEFORE any DB insert.
// ===========================================================================

describe('createClient unscoped-actor guard', () => {
  const clientRow = { id: 'c1', name: 'Kacper', slug: 'kacper', tenant_id: TENANT }

  it('rejects a scoped member (role member, not super_admin) with no-permission', async () => {
    // Holds the permission, but is a scoped member → must still be rejected.
    const { chains } = setupAuth({ so_clients: { data: clientRow, error: null } }, ALL_PERMS, {
      roleName: 'member',
      isSuperAdmin: false,
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Rejected BEFORE the insert — no DB write attempted.
    expect(chains.so_clients?.insert).toBeUndefined()
  })

  it('rejects a scoped member with a null role', async () => {
    const { chains } = setupAuth({ so_clients: { data: clientRow, error: null } }, ALL_PERMS, {
      roleName: null,
      isSuperAdmin: false,
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.so_clients?.insert).toBeUndefined()
  })

  it('allows an owner to create a client', async () => {
    const { chains } = setupAuth({ so_clients: { data: clientRow, error: null } }, ALL_PERMS, {
      roleName: 'owner',
      isSuperAdmin: false,
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(true)
    expect(chains.so_clients.insert).toHaveBeenCalled()
  })

  it('allows an admin to create a client', async () => {
    const { chains } = setupAuth({ so_clients: { data: clientRow, error: null } }, ALL_PERMS, {
      roleName: 'admin',
      isSuperAdmin: false,
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(true)
    expect(chains.so_clients.insert).toHaveBeenCalled()
  })

  it('allows a super_admin (even with a non-full-access role) to create a client', async () => {
    const { chains } = setupAuth({ so_clients: { data: clientRow, error: null } }, ALL_PERMS, {
      roleName: 'member',
      isSuperAdmin: true,
    })

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(true)
    expect(chains.so_clients.insert).toHaveBeenCalled()
  })
})

// ===========================================================================
// deleteClient unscoped-actor guard (iter 2 fix): client deletion is
// UNSCOPED-only (cascades to campaigns/bonuses/leads). Only super_admin or
// owner/admin (FULL_ACCESS_ROLES) may delete. An assigned scoped member may
// VIEW + UPDATE their client but must NOT delete it — rejected cleanly with the
// standard no-permission message BEFORE any DB call. App-layer mirror of the
// so_clients DELETE gate in 20260709120000_venture_scoped_access.sql.
// ===========================================================================

describe('deleteClient unscoped-actor guard', () => {
  it('rejects a scoped member (role member, not super_admin) with no-permission', async () => {
    const { chains } = setupAuth({ so_clients: { data: null, error: null } }, ALL_PERMS, {
      roleName: 'member',
      isSuperAdmin: false,
    })

    const result = await deleteClientHandler('c1')

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Rejected BEFORE the delete — no DB call attempted.
    expect(chains.so_clients?.delete).toBeUndefined()
  })

  it('rejects a scoped member with a null role', async () => {
    const { chains } = setupAuth({ so_clients: { data: null, error: null } }, ALL_PERMS, {
      roleName: null,
      isSuperAdmin: false,
    })

    const result = await deleteClientHandler('c1')

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.so_clients?.delete).toBeUndefined()
  })

  it('allows an owner to delete a client (scoped to tenant)', async () => {
    const { chains } = setupAuth({ so_clients: { data: null, error: null } }, ALL_PERMS, {
      roleName: 'owner',
      isSuperAdmin: false,
    })

    const result = await deleteClientHandler('c1')

    expect(result.success).toBe(true)
    expect(chains.so_clients.delete).toHaveBeenCalled()
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('allows an admin to delete a client', async () => {
    const { chains } = setupAuth({ so_clients: { data: null, error: null } }, ALL_PERMS, {
      roleName: 'admin',
      isSuperAdmin: false,
    })

    const result = await deleteClientHandler('c1')

    expect(result.success).toBe(true)
    expect(chains.so_clients.delete).toHaveBeenCalled()
  })

  it('allows a super_admin (even with a non-full-access role) to delete a client', async () => {
    const { chains } = setupAuth({ so_clients: { data: null, error: null } }, ALL_PERMS, {
      roleName: 'member',
      isSuperAdmin: true,
    })

    const result = await deleteClientHandler('c1')

    expect(result.success).toBe(true)
    expect(chains.so_clients.delete).toHaveBeenCalled()
  })
})

// ===========================================================================
// updateClient is deliberately NOT gated on the unscoped actor: an ASSIGNED
// scoped member MUST be able to edit their client (they enter the sensitive
// config). Row-level access is enforced by the so_clients UPDATE RLS policy
// (can_access_so_client). This locks the intended asymmetry: create/delete are
// admin-only, update is available to scoped members.
// ===========================================================================

describe('updateClient stays available to a scoped member (no unscoped guard)', () => {
  it('allows a scoped member to update a client', async () => {
    const row = { id: 'c1', name: 'Renamed', slug: 'renamed', tenant_id: TENANT }
    const { chains } = setupAuth({ so_clients: { data: row, error: null } }, ALL_PERMS, {
      roleName: 'member',
      isSuperAdmin: false,
    })

    const result = await updateClientHandler('c1', { name: 'Renamed' })

    expect(result.success).toBe(true)
    // The update runs (no pre-DB unscoped guard rejected it) and is tenant-scoped.
    expect(chains.so_clients.update).toHaveBeenCalled()
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
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
    setupAuth(
      { so_clients: { data: null, error: { code: '23505', message: rawDbMessage } } },
      ALL_PERMS,
      OWNER,
    )

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
    setupAuth(
      { so_clients: { data: null, error: { code: '42501', message: rawRlsMessage } } },
      ALL_PERMS,
      OWNER,
    )

    const result = await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.operationFailed)
    expect(result.error).not.toContain('row-level security')
    consoleSpy.mockRestore()
  })
})

// ===========================================================================
// Publish gate (iter 2b): a campaign can go published=true ONLY with a
// lead-source provider selected AND its required config satisfied (Tally →
// webhook secret set). A draft (published=false/omitted) allows NULL provider +
// incomplete config. Enforced server-side in create/update handlers (defense).
// ===========================================================================

describe('publish gate — createCampaign', () => {
  it('rejects publish=true without a lead_source_provider (draft cannot be published)', async () => {
    const { chains } = setupAuth({ so_clients: { data: { id: 'c1' }, error: null } })

    const result = await createCampaignHandler({
      client_id: 'c1',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      published: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.publishRequiresLeadSource)
    // Rejected BEFORE the insert.
    expect(chains.so_campaigns).toBeUndefined()
  })

  it('rejects publish=true with provider=tally but NO webhook secret', async () => {
    const { chains } = setupAuth({ so_clients: { data: { id: 'c1' }, error: null } })

    const result = await createCampaignHandler({
      client_id: 'c1',
      slug: 'launch',
      esp_provider: 'beehiiv',
      esp_tag_launch: 'launch-notify',
      lead_source_provider: 'tally',
      published: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.publishRequiresLeadSourceConfig)
    expect(chains.so_campaigns).toBeUndefined()
  })

  it('allows saving as a DRAFT without a provider (published=false)', async () => {
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
    expect(chains.so_campaigns.insert).toHaveBeenCalled()
    // Draft insert carries a NULL provider + empty non-secret config.
    expect(chains.so_campaigns.insert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_source_provider: null, lead_source_config: {} }),
    )
  })

  it('allows publish=true with provider=tally AND a webhook secret', async () => {
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
      lead_source_provider: 'tally',
      tally_webhook_secret: 'whsec_live',
      published: true,
    })

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.insert).toHaveBeenCalled()
    // The SECRET persists to its dedicated column, NEVER into lead_source_config.
    expect(chains.so_campaigns.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tally_webhook_secret: 'whsec_live',
        lead_source_provider: 'tally',
        lead_source_config: {},
      }),
    )
  })
})

describe('publish gate — updateCampaign', () => {
  it('rejects publish=true when neither the request nor the DB row has a secret', async () => {
    // so_campaigns finalValue serves BOTH assertCampaignOwned (client_id) and
    // fetchCampaignPublishState (provider/config/has_webhook_secret).
    const { chains } = setupAuth({
      so_campaigns: {
        data: {
          client_id: 'c1',
          lead_source_provider: 'tally',
          lead_source_config: {},
          has_webhook_secret: false,
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await updateCampaignHandler('camp-1', { published: true })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.publishRequiresLeadSourceConfig)
    expect(chains.so_campaigns.update).not.toHaveBeenCalled()
  })

  it('allows publish=true when the DB row already has the secret (rotate-skip)', async () => {
    const { chains } = setupAuth({
      so_campaigns: {
        data: {
          id: 'camp-1',
          client_id: 'c1',
          lead_source_provider: 'tally',
          lead_source_config: {},
          has_webhook_secret: true,
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await updateCampaignHandler('camp-1', { published: true })

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.update).toHaveBeenCalled()
  })

  it('rejects publish=true when the request EXPLICITLY clears the secret (null), even though the DB row had one', async () => {
    // Regression (SEC-3 / clear-secret edge): a falsy check treated null the
    // same as "field omitted" → fell back to the DB has_webhook_secret → gate
    // passed → campaign publishes while the patch writes secret=null → all
    // ingest 401s. The gate must see the RESULTING (cleared) secret state.
    const { chains } = setupAuth({
      so_campaigns: {
        data: {
          id: 'camp-1',
          client_id: 'c1',
          lead_source_provider: 'tally',
          lead_source_config: {},
          has_webhook_secret: true, // DB HAS a secret…
          published: false,
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await updateCampaignHandler('camp-1', {
      published: true,
      tally_webhook_secret: null, // …but this update clears it
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.publishRequiresLeadSourceConfig)
    expect(chains.so_campaigns.update).not.toHaveBeenCalled()
  })

  it('re-gates an ALREADY-published campaign when the provider is cleared with published OMITTED', async () => {
    // SEC-3 drift: an update that clears the provider (null) while OMITTING
    // published on a row that is ALREADY published must be re-gated over the
    // RESULTING (still-published) state — not skipped just because published
    // wasn't in the payload.
    const { chains } = setupAuth({
      so_campaigns: {
        data: {
          id: 'camp-1',
          client_id: 'c1',
          lead_source_provider: 'tally',
          lead_source_config: {},
          has_webhook_secret: true,
          published: true, // already published
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await updateCampaignHandler('camp-1', {
      lead_source_provider: null, // clears the provider; published omitted
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.venture.publishRequiresLeadSource)
    expect(chains.so_campaigns.update).not.toHaveBeenCalled()
  })

  it('allows a DRAFT update (published=false) to clear the provider to null (no DB read, no gate)', async () => {
    const { chains } = setupAuth({
      so_campaigns: {
        data: {
          id: 'camp-1',
          client_id: 'c1',
          lead_source_provider: 'tally',
          lead_source_config: {},
          has_webhook_secret: true,
          published: true,
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await updateCampaignHandler('camp-1', {
      published: false,
      lead_source_provider: null,
    })

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.update).toHaveBeenCalledWith(
      expect.objectContaining({ published: false, lead_source_provider: null }),
    )
  })
})

// ===========================================================================
// Config sanitization on ALL write paths (SEC-1): lead_source_config JSONB is
// in the authenticated SELECT allow-list, so a smuggled secret must NEVER reach
// it. CREATE + the provider-present UPDATE branch already sanitized; this locks
// the config-ONLY update branch (provider omitted) — it must sanitize against
// the EFFECTIVE (current DB) provider, never write the raw wire object.
// ===========================================================================

describe('lead_source_config sanitization on config-only update', () => {
  it('strips a smuggled secret from a config-only update (sanitized against the DB provider)', async () => {
    const { chains } = setupAuth({
      so_campaigns: {
        data: {
          id: 'camp-1',
          client_id: 'c1',
          lead_source_provider: 'tally', // effective provider resolved from DB
          lead_source_config: {},
          has_webhook_secret: true,
          published: false,
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await updateCampaignHandler('camp-1', {
      // provider OMITTED → config-only branch. Smuggled secret + junk key.
      lead_source_config: { secret: 'whsec_leaked', foo: 'bar' },
    })

    expect(result.success).toBe(true)
    // Tally's configSchema is z.object({}) → strips ALL keys → {}. The smuggled
    // secret never reaches the authenticated-readable JSONB column.
    expect(chains.so_campaigns.update).toHaveBeenCalledWith(
      expect.objectContaining({ lead_source_config: {} }),
    )
    const patch = chains.so_campaigns.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch.lead_source_config).not.toHaveProperty('secret')
    expect(patch.lead_source_config).not.toHaveProperty('foo')
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

// ===========================================================================
// Client mail secrets never selected by the authenticated client (mirrors the
// tally_webhook_secret defense-in-depth above). SELECT on
// so_clients.resend_api_key / gmail_app_password is revoked from
// `authenticated` at the DB layer, so every admin client read/write must
// project an EXPLICIT column list that omits them.
// ===========================================================================

describe('admin client selects never include the plaintext mail secrets', () => {
  const selectArgs = (chain: { select: { mock: { calls: unknown[][] } } }): string[] =>
    chain.select.mock.calls.map((c) => String(c[0] ?? ''))

  // Column-exact check — a naive substring `.toContain('resend_api_key')`
  // would also match the SAFE generated column `has_resend_api_key`. Split
  // each projection into individual column names and assert none is the
  // plaintext secret column exactly.
  const columns = (projection: string): string[] => projection.split(',').map((c) => c.trim())

  it('listClients projects explicit columns without resend_api_key/gmail_app_password', async () => {
    const { chains } = setupAuth({
      so_clients: { data: [], error: null },
    })

    await listClientsHandler()

    const args = selectArgs(chains.so_clients)
    expect(args.length).toBeGreaterThan(0)
    for (const a of args) {
      expect(a).not.toBe('*')
      expect(columns(a)).not.toContain('resend_api_key')
      expect(columns(a)).not.toContain('gmail_app_password')
    }
    expect(args.some((a) => a.includes('has_resend_api_key'))).toBe(true)
    expect(args.some((a) => a.includes('has_gmail_app_password'))).toBe(true)
  })

  it('createClient returns an explicit projection without the plaintext mail secrets', async () => {
    // Owner actor — createClient is unscoped-only, so the insert+select path
    // (the projection under test) only runs for an unscoped actor.
    const { chains } = setupAuth(
      { so_clients: { data: { id: 'c1', name: 'Kacper', slug: 'kacper' }, error: null } },
      ALL_PERMS,
      OWNER,
    )

    await createClientHandler({ name: 'Kacper', slug: 'kacper' })

    for (const a of selectArgs(chains.so_clients)) {
      expect(a).not.toBe('*')
      expect(columns(a)).not.toContain('resend_api_key')
      expect(columns(a)).not.toContain('gmail_app_password')
    }
    expect(selectArgs(chains.so_clients).some((a) => a.includes('has_resend_api_key'))).toBe(true)
  })

  it('updateClient returns an explicit projection without the plaintext mail secrets', async () => {
    const { chains } = setupAuth({
      so_clients: { data: { id: 'c1', name: 'Kacper', slug: 'kacper' }, error: null },
    })

    await updateClientHandler('c1', { name: 'Kacper Renamed' })

    for (const a of selectArgs(chains.so_clients)) {
      expect(a).not.toBe('*')
      expect(columns(a)).not.toContain('resend_api_key')
      expect(columns(a)).not.toContain('gmail_app_password')
    }
    expect(selectArgs(chains.so_clients).some((a) => a.includes('has_gmail_app_password'))).toBe(
      true,
    )
  })
})
