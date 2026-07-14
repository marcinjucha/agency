/**
 * Tests for the bonus-capable template handlers (Phase 4, model B):
 * list bonus-capable / assign-to-campaign.
 *
 * Targets the pure handlers in admin-handlers.server.ts directly (not the RPC
 * pipeline) — same pattern as admin-handlers.test.ts.
 *
 * Model B: templates are created/edited/deleted via the EXISTING generic
 * email-templates CRUD — there is NO venture-specific create handler. A campaign
 * may select ANY tenant-owned template by id; "bonus-capable" = the template's
 * blocks contain a text block whose trimmed content === '{{bonus_list}}'.
 *
 * What MUST be correct:
 *   - each handler self-gates (route map does NOT protect createServerFn);
 *   - list returns ONLY the caller-tenant templates that carry the {{bonus_list}}
 *     marker (a marker-less template is excluded), label ?? type fallback;
 *   - F5: a template id belonging to ANOTHER tenant can never be assigned;
 *   - a non-venture_bonus but owned template id IS accepted (model B — any type).
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
  listBonusTemplatesHandler,
  selectTemplateForCampaignHandler,
} from '../admin-handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'
const TEMPLATE_ID = '22222222-2222-2222-2222-222222222222'
// bonus_funnel.campaigns covers both list + assign in model B.
const ALL_PERMS = ['bonus_funnel.campaigns', 'system.email_templates']
// A text block whose trimmed content is exactly the structural marker.
const MARKER_BLOCKS = [{ id: 'm', type: 'text', content: '{{bonus_list}}' }]

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
// listBonusTemplatesHandler
// ===========================================================================

describe('listBonusTemplatesHandler', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['system.email_templates']) // wrong perm
    const result = await listBonusTemplatesHandler()
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('returns only tenant templates that carry the {{bonus_list}} marker (label ?? type fallback)', async () => {
    const { chains } = setupAuth({
      email_templates: {
        data: [
          // venture_bonus singleton default — carries the marker → included.
          { id: TEMPLATE_ID, label: 'Domyślny', type: 'venture_bonus', blocks: MARKER_BLOCKS },
          // another bonus-capable template (any type) → included.
          { id: 'other', label: 'Wariant', type: 'venture_bonus', blocks: MARKER_BLOCKS },
          // label null → falls back to the type slug.
          { id: 'nolabel', label: null, type: 'venture_bonus', blocks: MARKER_BLOCKS },
          // marker-less template → EXCLUDED.
          {
            id: 'plain',
            label: 'Zwykły',
            type: 'form_confirmation',
            blocks: [{ id: 'x', type: 'text', content: '<p>hej</p>' }],
          },
          // non-array blocks → EXCLUDED (never crashes the filter).
          { id: 'broken', label: 'Zepsuty', type: 'venture_bonus', blocks: {} },
        ],
        error: null,
      },
    })

    const result = await listBonusTemplatesHandler()

    expect(result.success).toBe(true)
    expect(result.data).toEqual([
      { id: TEMPLATE_ID, label: 'Domyślny' },
      { id: 'other', label: 'Wariant' },
      { id: 'nolabel', label: 'venture_bonus' },
    ])
    // marker-less + malformed rows excluded.
    expect(result.data?.some((t) => t.id === 'plain')).toBe(false)
    expect(result.data?.some((t) => t.id === 'broken')).toBe(false)
    // Scoped to the caller tenant. Model B: NOT restricted to the venture_bonus type.
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.email_templates.eq).not.toHaveBeenCalledWith('type', 'venture_bonus')
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
    // Verified under the caller tenant (model B: NOT type-scoped), campaign NEVER updated.
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.email_templates.eq).not.toHaveBeenCalledWith('type', 'venture_bonus')
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

  it('model B: accepts an owned template of ANY type (ownership check is not type-scoped)', async () => {
    // The owned template happens to be a non-venture_bonus type (e.g. form_confirmation) —
    // the mock ownership read returns a row regardless of type; model B allows it.
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
      email_templates: { data: { id: TEMPLATE_ID }, error: null },
    })

    const result = await selectTemplateForCampaignHandler(CAMPAIGN_ID, TEMPLATE_ID)

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.update).toHaveBeenCalledWith({ email_template_id: TEMPLATE_ID })
    // Ownership verified by id + tenant only — NOT restricted to venture_bonus.
    expect(chains.email_templates.eq).toHaveBeenCalledWith('id', TEMPLATE_ID)
    expect(chains.email_templates.eq).toHaveBeenCalledWith('tenant_id', TENANT)
    expect(chains.email_templates.eq).not.toHaveBeenCalledWith('type', 'venture_bonus')
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
