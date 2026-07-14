/**
 * Tests for the venture_bonus template-library handlers (Phase 4, increment 2):
 * list / create / assign-to-campaign.
 *
 * Targets the pure handlers in admin-handlers.server.ts directly (not the RPC
 * pipeline) — same pattern as admin-handlers.test.ts.
 *
 * What MUST be correct:
 *   - each handler self-gates (route map does NOT protect createServerFn);
 *   - create is gated on system.email_templates (TEMPLATE authority), NOT the
 *     campaign key — authority is not forked;
 *   - the created template carries the {{bonus_list}} marker + {{companyName}};
 *   - F5: a template id belonging to ANOTHER tenant can never be assigned;
 *   - list returns only the caller-tenant venture_bonus rows, default first.
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
import {
  createVentureTemplateHandler,
  listVentureTemplatesHandler,
  selectTemplateForCampaignHandler,
} from '../admin-handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'
const TEMPLATE_ID = '22222222-2222-2222-2222-222222222222'
// bonus_funnel.campaigns (assign/list) + system.email_templates (create).
const ALL_PERMS = ['bonus_funnel.campaigns', 'system.email_templates']

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

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// listVentureTemplatesHandler
// ===========================================================================

describe('listVentureTemplatesHandler', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['system.email_templates']) // has create perm, not list
    const result = await listVentureTemplatesHandler()
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('returns only the caller-tenant venture_bonus rows, default first', async () => {
    const { chains } = setupAuth({
      email_templates: {
        data: [
          { id: TEMPLATE_ID, label: 'Domyślny', is_default: true },
          { id: 'other', label: 'Wariant', is_default: false },
        ],
        error: null,
      },
    })

    const result = await listVentureTemplatesHandler()

    expect(result.success).toBe(true)
    expect(result.data).toEqual([
      { id: TEMPLATE_ID, label: 'Domyślny', isDefault: true },
      { id: 'other', label: 'Wariant', isDefault: false },
    ])
    // Scoped to the caller tenant + the venture_bonus type only.
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.email_templates.eq).toHaveBeenCalledWith('type', 'venture_bonus')
    // Default first (is_default desc), then by label.
    expect(chains.email_templates.order).toHaveBeenCalledWith('is_default', { ascending: false })
    expect(chains.email_templates.order).toHaveBeenCalledWith('label')
  })
})

// ===========================================================================
// createVentureTemplateHandler
// ===========================================================================

describe('createVentureTemplateHandler', () => {
  it('rejects without system.email_templates — even WITH the campaign key (authority not forked)', async () => {
    // Holds bonus_funnel.campaigns but NOT system.email_templates → rejected.
    const { from } = setupAuth({}, ['bonus_funnel.campaigns'])
    const result = await createVentureTemplateHandler({ label: 'Mail' })
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('inserts type=venture_bonus, is_default=false, with the marker + companyName blocks', async () => {
    const { chains } = setupAuth({
      email_templates: { data: { id: TEMPLATE_ID }, error: null },
    })

    const result = await createVentureTemplateHandler({ label: 'Mail bonusowy' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: TEMPLATE_ID })

    const payload = chains.email_templates.insert.mock.calls[0][0] as Record<string, unknown>
    expect(payload.tenant_id).toBe(TENANT)
    expect(payload.type).toBe('venture_bonus')
    expect(payload.label).toBe('Mail bonusowy')
    expect(payload.is_default).toBe(false)
    // The seeded blocks include the structural {{bonus_list}} marker (exact text
    // block) + the {{companyName}} copy token.
    const blocksJson = JSON.stringify(payload.blocks)
    expect(blocksJson).toContain('{{bonus_list}}')
    expect(blocksJson).toContain('{{companyName}}')
    const blocks = payload.blocks as Array<{ type: string; content?: string }>
    expect(
      blocks.some((b) => b.type === 'text' && b.content?.trim() === '{{bonus_list}}'),
    ).toBe(true)
  })

  it('rejects a blank label at the wire boundary (zod)', async () => {
    const { createVentureTemplateSchema } = await import('../validation')
    expect(createVentureTemplateSchema.safeParse({ label: '' }).success).toBe(false)
    expect(createVentureTemplateSchema.safeParse({ label: '   ' }).success).toBe(false)
    expect(createVentureTemplateSchema.safeParse({ label: 'ok' }).success).toBe(true)
  })
})

// ===========================================================================
// selectTemplateForCampaignHandler (F5 — cross-tenant forged-id guard)
// ===========================================================================

describe('selectTemplateForCampaignHandler', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['system.email_templates'])
    const result = await selectTemplateForCampaignHandler(CAMPAIGN_ID, TEMPLATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('F5: rejects a templateId belonging to ANOTHER tenant and does NOT update the campaign', async () => {
    // Campaign is owned (client walk resolves), but the template does not resolve
    // under the caller tenant + type → email_templates read returns null → reject.
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
      email_templates: { data: null, error: null }, // foreign/absent → not owned
    })

    const result = await selectTemplateForCampaignHandler(CAMPAIGN_ID, TEMPLATE_ID)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Verified under the caller tenant + type, and the campaign was NEVER updated.
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.email_templates.eq).toHaveBeenCalledWith('type', 'venture_bonus')
    expect(chains.so_campaigns.update).not.toHaveBeenCalled()
  })

  it('rejects a forged campaign id (campaign not owned) before any template read', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: null, error: null }, // campaign not visible → not owned
    })

    const result = await selectTemplateForCampaignHandler(CAMPAIGN_ID, TEMPLATE_ID)

    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    // Never reached the template ownership check nor the update.
    expect(chains.email_templates).toBeUndefined()
    expect(chains.so_campaigns.update).not.toHaveBeenCalled()
  })

  it('assigns an owned template to an owned campaign', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
      email_templates: { data: { id: TEMPLATE_ID }, error: null }, // owned
    })

    const result = await selectTemplateForCampaignHandler(CAMPAIGN_ID, TEMPLATE_ID)

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.update).toHaveBeenCalledWith({ email_template_id: TEMPLATE_ID })
    expect(chains.so_campaigns.eq).toHaveBeenCalledWith('id', CAMPAIGN_ID)
  })

  it('clears the assignment (templateId=null) WITHOUT a template read', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const result = await selectTemplateForCampaignHandler(CAMPAIGN_ID, null)

    expect(result.success).toBe(true)
    // NULL clears → no ownership lookup, update writes null.
    expect(chains.email_templates).toBeUndefined()
    expect(chains.so_campaigns.update).toHaveBeenCalledWith({ email_template_id: null })
  })
})
