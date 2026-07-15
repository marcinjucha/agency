/**
 * Tests for the READ-ONLY effective-send handler (council 2026-07-14
 * "surface-and-defer" — the "Ten launch wysyła" card server fn).
 *
 * Targets the pure handler in admin-handlers.server.ts directly (not the RPC
 * pipeline), same pattern as admin-handlers.test.ts.
 *
 * What MUST be correct: the effective sender is computed via the SAME
 * resolveMailSender (isSharedFallback true/false), the fn gates itself on
 * bonus_funnel.campaigns (route map does NOT protect createServerFn), the
 * campaign → client chain is tenant/ownership-scoped, AND the mirrored template
 * STATE matches the send path exactly (product decision 2026-07-15):
 *   - no selection            → { kind: 'none' }  (NO email is sent)
 *   - selected + usable        → { kind: 'template', id, name, type }
 *   - selected but broken/absent → { kind: 'builtin' }  (hardcoded builder)
 * There is NO implicit tenant-default tier anymore.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { mockChain } from '@/__tests__/utils/supabase-mocks'
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
import { getCampaignEffectiveSendHandler } from '../admin-handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'
const CLIENT_ID = 'client-1'
const ASSIGNED = '99999999-9999-9999-9999-999999999999'
const SHARED_FROM = 'noreply@haloefekt.pl'
const ALL_PERMS = ['bonus_funnel.clients', 'bonus_funnel.campaigns', 'bonus_funnel.bonuses']
// A usable `blocks` value — a non-empty array (mirrors ingest's usability rule).
const USABLE_BLOCKS = [{ type: 'text', content: 'hej' }]

// Full mail-config row shape the authenticated client reads (NO plaintext
// secrets — only the has_* generated booleans + non-secret address fields).
type ClientMailRow = {
  id: string
  mail_provider: string
  resend_from_email: string | null
  gmail_address: string | null
  sender_name: string | null
  has_resend_api_key: boolean
  has_gmail_app_password: boolean
}

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
      roleName: 'owner',
      permissions,
    }),
  )
  return { from, chains }
}

function clientRow(overrides: Partial<ClientMailRow>): ClientMailRow {
  return {
    id: CLIENT_ID,
    mail_provider: 'resend_shared',
    resend_from_email: null,
    gmail_address: null,
    sender_name: null,
    has_resend_api_key: false,
    has_gmail_app_password: false,
    ...overrides,
  }
}

// A campaign that SELECTS the ASSIGNED template (resolves to a usable row). Used
// by the sender-focused tests where the template state is incidental.
function tables(client: ClientMailRow) {
  return {
    so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: ASSIGNED }, error: null },
    so_clients: { data: client, error: null },
    email_templates: {
      data: { id: ASSIGNED, label: 'Wariant klienta', type: 'venture_bonus', blocks: USABLE_BLOCKS },
      error: null,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_FROM_EMAIL = SHARED_FROM
})

describe('getCampaignEffectiveSendHandler — permission gating', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['bonus_funnel.clients'])
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })
})

describe('getCampaignEffectiveSendHandler — ownership scoping', () => {
  it('rejects when the campaign resolves no owning client (missing/other tenant)', async () => {
    setupAuth({ so_campaigns: { data: null, error: null } })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('rejects when the client is not owned by the tenant', async () => {
    // so_campaigns yields a client_id, but assertClientOwned finds no row
    // scoped to the tenant → forbidden (cross-tenant read blocked).
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: null }, error: null },
      so_clients: { data: null, error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('scopes the client read to the caller tenant', async () => {
    const { chains } = setupAuth(tables(clientRow({})))
    await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })
})

describe('getCampaignEffectiveSendHandler — effective sender', () => {
  it('shared agency fallback (resend_shared) → isSharedFallback true, shared address', async () => {
    setupAuth(tables(clientRow({ mail_provider: 'resend_shared' })))
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.success).toBe(true)
    expect(result.data?.isSharedFallback).toBe(true)
    expect(result.data?.senderEmail).toBe(SHARED_FROM)
    expect(result.data?.senderLabel).toBe(messages.venture.mailProviderResendShared)
  })

  it('own Resend complete → isSharedFallback false, client address', async () => {
    setupAuth(
      tables(
        clientRow({
          mail_provider: 'resend_own',
          resend_from_email: 'kontakt@klient.pl',
          has_resend_api_key: true,
        }),
      ),
    )
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.isSharedFallback).toBe(false)
    expect(result.data?.senderEmail).toBe('kontakt@klient.pl')
    expect(result.data?.senderLabel).toBe(messages.venture.mailProviderResendOwn)
  })

  it('own Resend with MISSING api key → degrades to shared fallback', async () => {
    setupAuth(
      tables(
        clientRow({
          mail_provider: 'resend_own',
          resend_from_email: 'kontakt@klient.pl',
          has_resend_api_key: false, // secret absent → factory returns null → shared
        }),
      ),
    )
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.isSharedFallback).toBe(true)
    expect(result.data?.senderEmail).toBe(SHARED_FROM)
  })

  it('Gmail SMTP complete → isSharedFallback false, gmail address', async () => {
    setupAuth(
      tables(
        clientRow({
          mail_provider: 'gmail_smtp',
          gmail_address: 'launch@gmail.com',
          has_gmail_app_password: true,
        }),
      ),
    )
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.isSharedFallback).toBe(false)
    expect(result.data?.senderEmail).toBe('launch@gmail.com')
    expect(result.data?.senderLabel).toBe(messages.venture.mailProviderGmail)
  })
})

// ===========================================================================
// DRIFT-GUARD: the template STATE MUST match what the send path (ingest.server.ts
// sendBonusEmail) would use for the SAME campaign — no default tier:
//   - no selection            → 'none'    (NO email is sent)
//   - selected + usable        → 'template' (that id/name/type)
//   - selected but broken/absent → 'builtin' (hardcoded builder)
// ===========================================================================

describe('getCampaignEffectiveSendHandler — template state (drift guard)', () => {
  it('no template selected → { kind: "none" } and NO template read', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: null }, error: null },
      so_clients: { data: clientRow({}), error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.template).toEqual({ kind: 'none' })
    // No selection → no email_templates query at all.
    expect(chains.email_templates).toBeUndefined()
  })

  it('selected + resolves usable → { kind: "template", id, name, type } (by-id read, model B any type)', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: ASSIGNED }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: {
        data: { id: ASSIGNED, label: 'Wariant klienta', type: 'marketing_blast', blocks: USABLE_BLOCKS },
        error: null,
      },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.template).toEqual({
      kind: 'template',
      id: ASSIGNED,
      name: 'Wariant klienta',
      type: 'marketing_blast',
    })
    // The by-id read is tenant-scoped and NOT type-constrained (model B).
    expect(chains.email_templates.eq).toHaveBeenCalledWith('id', ASSIGNED)
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.email_templates.eq).not.toHaveBeenCalledWith('type', 'venture_bonus')
    // Exactly ONE email_templates read — there is no default tier.
    expect(chains.email_templates.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('selected but row MISSING (wrong tenant / deleted) → { kind: "builtin" }', async () => {
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: ASSIGNED }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: { data: null, error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.template).toEqual({ kind: 'builtin' })
  })

  it('selected but blocks EMPTY (unusable) → { kind: "builtin" } (mirrors ingest coerce)', async () => {
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: ASSIGNED }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: {
        data: { id: ASSIGNED, label: 'Pusty wariant', type: 'marketing_blast', blocks: [] },
        error: null,
      },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    // NOT named — an unusable selected template falls to the hardcoded builder,
    // exactly as ingest skips it.
    expect(result.data?.template).toEqual({ kind: 'builtin' })
  })
})
