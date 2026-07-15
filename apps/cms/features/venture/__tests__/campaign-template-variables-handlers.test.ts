/**
 * Tests for the per-campaign template-variable handlers (Iter 3b):
 *   - getCampaignTemplateVariablesHandler — resolves the EFFECTIVE template's
 *     fillable variable fields (declared-first, extraction fallback) + the
 *     campaign's saved values;
 *   - saveCampaignTemplateVariablesHandler — persists the flat values map.
 *
 * Targets the pure handlers directly (not the RPC pipeline) — same pattern as
 * venture-templates-handlers.test.ts.
 *
 * What MUST be correct:
 *   - each handler self-gates (route map does NOT protect createServerFn);
 *   - variables read is tenant-scoped (campaign → client walk);
 *   - "Domyślny" (email_template_id null) still resolves the tenant default's vars;
 *   - declared template_variables win; saved values are returned verbatim;
 *   - save writes template_variable_values scoped to the owned campaign only.
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
  getCampaignTemplateVariablesHandler,
  saveCampaignTemplateVariablesHandler,
} from '../admin-handlers.server'

const mockRequireAuth = requireAuthContextFull as ReturnType<typeof vi.fn>

const TENANT = 'tenant-1'
const CAMPAIGN_ID = '11111111-1111-1111-1111-111111111111'
const ALL_PERMS = ['bonus_funnel.campaigns', 'system.email_templates']

function setupAuth(tableResults: Record<string, unknown>, permissions: string[] = ALL_PERMS) {
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
// getCampaignTemplateVariablesHandler
// ===========================================================================

describe('getCampaignTemplateVariablesHandler', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['system.email_templates'])
    const result = await getCampaignTemplateVariablesHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects a forged campaign id (campaign not owned)', async () => {
    setupAuth({ so_campaigns: { data: null, error: null } })
    const result = await getCampaignTemplateVariablesHandler(CAMPAIGN_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
  })

  it('resolves the tenant default (Domyślny) declared vars + returns saved values', async () => {
    setupAuth({
      so_campaigns: {
        data: {
          client_id: 'c1',
          email_template_id: null, // Domyślny → resolve tenant default
          template_variable_values: { companyName: 'Acme' },
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
      // The tenant venture_bonus default row — usable blocks + declared vars.
      email_templates: {
        data: {
          id: 'tpl-default',
          label: 'Domyślny',
          type: 'venture_bonus',
          subject: 'Cześć {{firstName}}',
          blocks: [{ id: 'b1', type: 'text', content: 'Body' }],
          template_variables: [{ key: 'companyName', label: 'Firma' }],
        },
        error: null,
      },
    })

    const result = await getCampaignTemplateVariablesHandler(CAMPAIGN_ID)

    expect(result.success).toBe(true)
    // Declared-first: uses template_variables (NOT the {{firstName}} in subject).
    expect(result.data?.fields).toEqual([
      { key: 'companyName', label: 'Firma', description: undefined },
    ])
    // Saved values returned verbatim.
    expect(result.data?.values).toEqual({ companyName: 'Acme' })
  })

  it('returns empty fields + saved values when no template resolves (hardcoded builder)', async () => {
    setupAuth({
      so_campaigns: {
        data: {
          client_id: 'c1',
          email_template_id: null,
          template_variable_values: { companyName: 'Acme' },
        },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
      // No tenant default row → resolution yields null → no fillable fields.
      email_templates: { data: null, error: null },
    })

    const result = await getCampaignTemplateVariablesHandler(CAMPAIGN_ID)

    expect(result.success).toBe(true)
    expect(result.data?.fields).toEqual([])
    expect(result.data?.values).toEqual({ companyName: 'Acme' })
  })

  it('coerces a null / non-object template_variable_values to {}', async () => {
    setupAuth({
      so_campaigns: {
        data: { client_id: 'c1', email_template_id: null, template_variable_values: null },
        error: null,
      },
      so_clients: { data: { id: 'c1' }, error: null },
      email_templates: { data: null, error: null },
    })

    const result = await getCampaignTemplateVariablesHandler(CAMPAIGN_ID)

    expect(result.success).toBe(true)
    expect(result.data?.values).toEqual({})
  })
})

// ===========================================================================
// saveCampaignTemplateVariablesHandler
// ===========================================================================

describe('saveCampaignTemplateVariablesHandler', () => {
  it('rejects without bonus_funnel.campaigns (no DB access)', async () => {
    const { from } = setupAuth({}, ['system.email_templates'])
    const result = await saveCampaignTemplateVariablesHandler(CAMPAIGN_ID, { companyName: 'Acme' })
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects a forged campaign id before any write', async () => {
    const { chains } = setupAuth({ so_campaigns: { data: null, error: null } })
    const result = await saveCampaignTemplateVariablesHandler(CAMPAIGN_ID, { companyName: 'Acme' })
    expect(result.success).toBe(false)
    expect(result.error).toBe(messages.common.noPermission)
    expect(chains.so_campaigns.update).not.toHaveBeenCalled()
  })

  it('persists the values map to the owned campaign', async () => {
    const { chains } = setupAuth({
      so_campaigns: { data: { client_id: 'c1' }, error: null },
      so_clients: { data: { id: 'c1' }, error: null },
    })

    const values = { companyName: 'Acme', firstName: 'Jan' }
    const result = await saveCampaignTemplateVariablesHandler(CAMPAIGN_ID, values)

    expect(result.success).toBe(true)
    expect(chains.so_campaigns.update).toHaveBeenCalledWith({ template_variable_values: values })
    expect(chains.so_campaigns.eq).toHaveBeenCalledWith('id', CAMPAIGN_ID)
  })
})
