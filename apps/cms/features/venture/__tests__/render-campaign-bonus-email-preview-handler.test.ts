/**
 * Tests for renderCampaignBonusEmailPreviewHandler — the campaign editor's
 * "Podgląd e-mail" tab, which must render the REAL bonus email a send would
 * deliver (byte-identical to ingest), NOT a generic theme swatch mock.
 *
 * Targets the pure handler in admin-handlers.server.ts directly (not the RPC
 * pipeline), same pattern as effective-send-handler.test.ts.
 *
 * The DRIFT/PARITY guard is the reason this exists: a template header token-bound
 * to `primary` must render the campaign's primary hex (#f59e0b), exactly as the
 * send builder does — the old mock coloured it from `headerBackground` (navy) and
 * lied about what would be sent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import type { Json } from '@agency/database'
import type { Block } from '@agency/email'
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
import { renderCampaignBonusEmailPreviewHandler } from '../admin-handlers.server'
import { buildBonusEmailBody, resolveVentureSendTheme } from '../mail/render-bonus-email.server'
import { BONUS_LIST_MARKER } from '../mail/bonus-email-template'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'
const CLIENT_ID = 'client-1'
const ASSIGNED_TEMPLATE_ID = '99999999-9999-9999-9999-999999999999'
const PRIMARY_HEX = '#f59e0b'
const DISPLAY_NAME = 'Kacper Launch'
const ALL_PERMS = ['bonus_funnel.clients', 'bonus_funnel.campaigns', 'bonus_funnel.bonuses']

// A bonus-capable template whose HEADER is token-bound to `primary`. The raw
// backgroundColor (#111111) and the theme's headerBackground role are BOTH
// overridden by the `primary` token in the render ladder (a > b > c) — this is
// exactly the case the generic mock got wrong.
const TEMPLATE_BLOCKS: Block[] = [
  {
    id: 'h',
    type: 'header',
    companyName: '{{companyName}}',
    textColor: '#ffffff',
    backgroundColor: '#111111',
    backgroundColorToken: 'primary',
  },
  { id: 'm', type: 'text', content: BONUS_LIST_MARKER },
  { id: 'f', type: 'footer', text: 'Stopka' },
]
const TEMPLATE_SUBJECT = 'Twoje bonusy'

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

// A campaign with an inline primary brand + an assigned bonus template.
function tables(overrides?: {
  campaignBrand?: Json | null
  campaignTemplateId?: string | null
  template?: { blocks: Block[]; subject: string } | null
  bonuses?: Array<{ title: string | null; url: string | null }>
}) {
  const brand = overrides?.campaignBrand ?? ({ primary: PRIMARY_HEX } as Json)
  const templateId =
    overrides?.campaignTemplateId === undefined ? ASSIGNED_TEMPLATE_ID : overrides.campaignTemplateId
  const template =
    overrides?.template === undefined
      ? { blocks: TEMPLATE_BLOCKS, subject: TEMPLATE_SUBJECT }
      : overrides.template
  return {
    so_campaigns: {
      data: {
        client_id: CLIENT_ID,
        display_name: DISPLAY_NAME,
        theme_id: null,
        brand,
        email_template_id: templateId,
      },
      error: null,
    },
    so_clients: { data: { id: CLIENT_ID, theme_id: null, theme: null }, error: null },
    tenants: { data: { theme_id: null, theme: null }, error: null },
    so_bonuses: { data: overrides?.bonuses ?? [], error: null },
    email_templates: {
      data: template ? { blocks: template.blocks, subject: template.subject } : null,
      error: null,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('renderCampaignBonusEmailPreviewHandler — permission gating', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['bonus_funnel.clients'])
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })
})

describe('renderCampaignBonusEmailPreviewHandler — ownership scoping', () => {
  it('rejects when the campaign resolves no owning client', async () => {
    setupAuth({ so_campaigns: { data: null, error: null } })
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('rejects when the client is not owned by the tenant', async () => {
    setupAuth({
      so_campaigns: { data: { client_id: CLIENT_ID }, error: null },
      so_clients: { data: null, error: null },
    })
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('scopes the client theme-tier read to the caller tenant', async () => {
    const { chains } = setupAuth(tables())
    await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(chains.so_clients.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('scopes the assigned-template read to the caller tenant', async () => {
    const { chains } = setupAuth(tables())
    await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })
})

describe('renderCampaignBonusEmailPreviewHandler — render', () => {
  it('returns HTML from the send builder (theme tiers + effective template)', async () => {
    setupAuth(tables())
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(true)
    expect(typeof result.data?.html).toBe('string')
    expect(result.data?.html.length).toBeGreaterThan(0)
  })

  it('falls back to the hardcoded builder when no template resolves', async () => {
    setupAuth(tables({ campaignTemplateId: null, template: null }))
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(true)
    expect(result.data?.html.length).toBeGreaterThan(0)
  })

  it('still renders (neutral tenant tier) when the tenant theme read errors', async () => {
    // Parity with ingest: a transient tenant-theme read error degrades to the
    // neutral default rather than surfacing as a preview error (client brand wins).
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setupAuth({
      ...tables(),
      tenants: { data: null, error: { message: 'boom', code: 'XX000' } },
    })
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(true)
    expect(result.data?.html.length).toBeGreaterThan(0)
    errorSpy.mockRestore()
  })
})

// ===========================================================================
// PARITY / BUG-FIX GUARD: the preview must match the REAL send output. For a
// campaign whose selected template header is token-bound to `primary` and whose
// resolved theme has primary=#f59e0b, the preview header background is #f59e0b
// (the primary token) — NOT the headerBackground navy the old mock showed.
// ===========================================================================
describe('renderCampaignBonusEmailPreviewHandler — send parity', () => {
  it('preview HTML equals the send builder output AND uses the primary token in the header', async () => {
    setupAuth(tables())
    const result = await renderCampaignBonusEmailPreviewHandler(CAMPAIGN_ID)
    expect(result.success).toBe(true)

    // Reconstruct the EXACT send output: same tier resolution (null theme_ids →
    // inline brand → campaign tier) + same builder + same {{companyName}}. The
    // fake client is never touched (all theme_ids null → no so_themes reads).
    const theme = await resolveVentureSendTheme(
      { from: () => { throw new Error('no theme_id reads expected') } },
      {
        tenantThemeId: null,
        tenantTheme: null,
        clientThemeId: null,
        clientTheme: null,
        campaignThemeId: null,
        campaignBrand: { primary: PRIMARY_HEX } as Json,
      },
    )
    expect(theme.primary).toBe(PRIMARY_HEX)

    const expected = await buildBonusEmailBody(
      { blocks: TEMPLATE_BLOCKS, subject: TEMPLATE_SUBJECT },
      DISPLAY_NAME,
      [],
      theme,
    )

    // Byte-identical to the send builder output — preview cannot drift from ingest.
    expect(result.data?.html).toBe(expected.html)
    // The bug fix: the primary token (#f59e0b) reaches the header, not navy.
    expect(result.data?.html).toContain(PRIMARY_HEX)
  })
})
