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
// campaign.email_template_id if it resolves to a valid tenant-owned row (ANY
// type, model B), else the tenant DEFAULT (venture_bonus singleton slug), else
// null. The card must not drift from
// the send path. (email_templates is a single mock chain per table, so each
// scenario exercises exactly ONE resolution read tier — by-id OR default.)
// ===========================================================================

describe('getCampaignEffectiveSendHandler — resolved template (drift guard)', () => {
  const ASSIGNED = '99999999-9999-9999-9999-999999999999'
  const DEFAULT_ID = '88888888-8888-8888-8888-888888888888'
  // A usable `blocks` value — a non-empty array (mirrors ingest's usability rule).
  const USABLE_BLOCKS = [{ type: 'text', content: 'hej' }]

  it('campaign.email_template_id set + resolves → that id + type (by-id tier)', async () => {
    // Model B: the assigned template may be ANY type — the type slug flows through
    // to power the editor deep-link.
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: ASSIGNED }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: {
        data: { id: ASSIGNED, label: 'Wariant klienta', type: 'marketing_blast', blocks: USABLE_BLOCKS },
        error: null,
      },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.resolvedTemplateId).toBe(ASSIGNED)
    expect(result.data?.resolvedTemplateName).toBe('Wariant klienta')
    expect(result.data?.resolvedTemplateType).toBe('marketing_blast')
  })

  it('no assignment → the tenant default row id + type (default tier)', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID, email_template_id: null }, error: null },
      so_clients: { data: clientRow({}), error: null },
      email_templates: {
        data: { id: DEFAULT_ID, label: 'Domyślny', type: 'venture_bonus', blocks: USABLE_BLOCKS },
        error: null,
      },
    })
    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    expect(result.data?.resolvedTemplateId).toBe(DEFAULT_ID)
    expect(result.data?.resolvedTemplateName).toBe('Domyślny')
    expect(result.data?.resolvedTemplateType).toBe('venture_bonus')
    // [7] SINGLE QUERY: the tenant venture_bonus default row is read exactly ONCE
    // (readTenantDefaultBonusTemplate) — templateExists + the default-tier choice
    // are derived from that one read; no assignment → no by-id query, and the
    // default reader passed to the precedence resolver is a NO-QUERY cached one.
    expect(chains.email_templates.maybeSingle).toHaveBeenCalledTimes(1)
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
    expect(result.data?.resolvedTemplateType).toBeNull()
  })

  // The reason this fix exists: an assigned template whose blocks were later
  // emptied via the generic editor is SKIPPED by ingest (coerceBonusTemplateRow →
  // isUsableTemplateBlocks). The card must degrade to the SAME default, never name
  // the assigned-but-unusable one. Needs DISTINCT data per email_templates read
  // (exists check → by-id unusable → default usable), so it bypasses the
  // single-chain setupAuth helper.
  it('assigned template with EMPTY blocks → falls through to tenant default (mirrors ingest)', async () => {
    // [7] read order after the single-read refactor: (1) readTenantDefaultBonusTemplate
    // (the venture_bonus default, eager — powers templateExists AND the cached
    // default-tier choice), then (2) the by-id read for the assignment. The default
    // reader handed to the precedence resolver is the CACHED choice → no 3rd query.
    const emailQueue: Array<{ data: unknown; error: unknown }> = [
      // 1. readTenantDefaultBonusTemplate → the usable tenant venture_bonus singleton
      //    (present=true, choice=DEFAULT_ID).
      {
        data: { id: DEFAULT_ID, label: 'Domyślny', type: 'venture_bonus', blocks: USABLE_BLOCKS },
        error: null,
      },
      // 2. by-id read → the assigned row, but blocks emptied → UNUSABLE → absent →
      //    precedence falls to the cached default (DEFAULT_ID), NOT the assigned one.
      {
        data: { id: ASSIGNED, label: 'Pusty wariant', type: 'marketing_blast', blocks: [] },
        error: null,
      },
    ]
    let emailIdx = 0
    const staticChains: Record<string, ReturnType<typeof mockChain>> = {
      so_campaigns: mockChain({
        data: { client_id: CLIENT_ID, email_template_id: ASSIGNED },
        error: null,
      }),
      so_clients: mockChain({ data: clientRow({}), error: null }),
    }
    const from = vi.fn((name: string) => {
      if (name === 'email_templates') {
        const res = emailQueue[emailIdx] ?? emailQueue[emailQueue.length - 1]
        emailIdx++
        return mockChain(res)
      }
      return staticChains[name]
    })
    mockRequireAuth.mockReturnValue(
      okAsync({
        supabase: { from },
        userId: 'user-1',
        tenantId: TENANT,
        isSuperAdmin: false,
        roleName: 'owner',
        permissions: ALL_PERMS,
      }),
    )

    const result = await getCampaignEffectiveSendHandler(CAMPAIGN_ID)
    // NOT the assigned-but-unusable ASSIGNED id — the default, exactly as ingest.
    expect(result.data?.resolvedTemplateId).toBe(DEFAULT_ID)
    expect(result.data?.resolvedTemplateName).toBe('Domyślny')
    expect(result.data?.resolvedTemplateType).toBe('venture_bonus')
    // A venture_bonus row exists (even the by-id was empty, not this one) → true.
    expect(result.data?.templateExists).toBe(true)
    // Exactly TWO email_templates reads: the eager default + the by-id. The default
    // is NOT re-queried for the precedence tier (cached) — [7].
    expect(emailIdx).toBe(2)
  })
})
