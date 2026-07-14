/**
 * Tests for the READ-ONLY effective-send handler (council 2026-07-14
 * "surface-and-defer" — the "Ten launch wysyła" card server fn).
 *
 * Targets the pure handler in admin-handlers.server.ts directly (not the RPC
 * pipeline), same pattern as admin-handlers.test.ts.
 *
 * What MUST be correct: the effective sender is computed via the SAME
 * resolveMailSender (isSharedFallback true/false), the fn gates itself on
 * bonus_funnel.campaigns (route map does NOT protect createServerFn), and the
 * campaign → client chain is tenant/ownership-scoped.
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
const SHARED_FROM = 'noreply@haloefekt.pl'
const ALL_PERMS = ['bonus_funnel.clients', 'bonus_funnel.campaigns', 'bonus_funnel.bonuses']

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

function tables(client: ClientMailRow, templateExists: boolean) {
  return {
    so_campaigns: { data: { client_id: CLIENT_ID }, error: null },
    so_clients: { data: client, error: null },
    email_templates: {
      data: templateExists ? { type: 'venture_bonus' } : null,
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
      so_campaigns: { data: { client_id: CLIENT_ID }, error: null },
      so_clients: { data: null, error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('scopes the client read to the caller tenant', async () => {
    const { chains } = setupAuth(tables(clientRow({}), true))
    await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })
})

describe('getCampaignEffectiveSendHandler — effective sender', () => {
  it('shared agency fallback (resend_shared) → isSharedFallback true, shared address', async () => {
    setupAuth(tables(clientRow({ mail_provider: 'resend_shared' }), true))
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
        true,
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
        true,
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
        true,
      ),
    )
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.isSharedFallback).toBe(false)
    expect(result.data?.senderEmail).toBe('launch@gmail.com')
    expect(result.data?.senderLabel).toBe(messages.venture.mailProviderGmail)
  })
})

describe('getCampaignEffectiveSendHandler — template presence', () => {
  it('templateType is venture_bonus + templateExists true when a row exists', async () => {
    setupAuth(tables(clientRow({}), true))
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.templateType).toBe('venture_bonus')
    expect(result.data?.templateExists).toBe(true)
  })

  it('templateExists false when no tenant row exists', async () => {
    setupAuth(tables(clientRow({}), false))
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.templateExists).toBe(false)
  })
})

// ===========================================================================
// DRIFT-GUARD (INV-4, one-rule): resolvedTemplateId MUST match the id
// fetchBonusTemplate (ingest.server.ts) would pick for the SAME campaign —
// campaign.email_template_id if it resolves to a valid tenant venture_bonus row,
// else the tenant DEFAULT (is_default), else null. The card must not drift from
// the send path. (email_templates is a single mock chain per table, so each
// scenario exercises exactly ONE resolution read tier — by-id OR default.)
// ===========================================================================

describe('getCampaignEffectiveSendHandler — resolved template (drift guard)', () => {
  const ASSIGNED = '99999999-9999-9999-9999-999999999999'
  const DEFAULT_ID = '88888888-8888-8888-8888-888888888888'

  it('campaign.email_template_id set + resolves → that id (by-id tier)', async () => {
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: ASSIGNED }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: { data: { id: ASSIGNED, label: 'Wariant klienta' }, error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.resolvedTemplateId).toBe(ASSIGNED)
    expect(result.data?.resolvedTemplateName).toBe('Wariant klienta')
  })

  it('no assignment → the tenant default row id (default tier)', async () => {
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: null }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: { data: { id: DEFAULT_ID, label: 'Domyślny' }, error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.resolvedTemplateId).toBe(DEFAULT_ID)
    expect(result.data?.resolvedTemplateName).toBe('Domyślny')
  })

  it('no assignment + no default → null ("wbudowany szablon")', async () => {
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: null }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: { data: null, error: null },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.resolvedTemplateId).toBeNull()
    expect(result.data?.resolvedTemplateName).toBeNull()
  })
})
