import { describe, it, expect } from 'vitest'
import type { AuthContext } from '@/lib/server-auth.server'
import { getEmailTemplateUsage } from '../server'

// ---------------------------------------------------------------------------
// getEmailTemplateUsage — delete-guard count (email_templates ← so_campaigns).
//
// Deleting an email template is SAFE (FK is ON DELETE SET NULL, never blocked)
// but silently un-assigns every campaign that selected it via
// so_campaigns.email_template_id. The dialog warns with this count first. We
// assert: 0 refs, N refs (with names), and tenant-scoped id resolution.
// ---------------------------------------------------------------------------

const TENANT = 'tenant-1'
const TEMPLATE_ID = 'tmpl-1'

interface Recorded {
  templateEqArgs: Array<[string, unknown]>
  campaignEqArgs: Array<[string, unknown]>
}

/**
 * Two-table supabase mock. `email_templates` resolves the template id via
 * select→eq→eq→maybeSingle; `so_campaigns` resolves the campaign rows via
 * select→eq (thenable). Captures the `.eq()` args on both to prove scoping.
 */
function makeAuth(
  templateRow: { id: string } | null,
  campaignRows: { display_name: string | null }[],
): { auth: AuthContext; rec: Recorded } {
  const rec: Recorded = { templateEqArgs: [], campaignEqArgs: [] }

  const templateBuilder = {
    select: () => templateBuilder,
    eq: (col: string, val: unknown) => {
      rec.templateEqArgs.push([col, val])
      return templateBuilder
    },
    maybeSingle: () => Promise.resolve({ data: templateRow, error: null }),
  }

  const campaignBuilder = {
    select: () => campaignBuilder,
    eq: (col: string, val: unknown) => {
      rec.campaignEqArgs.push([col, val])
      return Promise.resolve({ data: campaignRows, error: null })
    },
  }

  const from = (table: string) =>
    table === 'email_templates' ? templateBuilder : campaignBuilder

  const auth = { supabase: { from }, tenantId: TENANT, userId: 'u1' } as unknown as AuthContext
  return { auth, rec }
}

describe('getEmailTemplateUsage — campaign delete-guard count', () => {
  it('returns 0 when no campaign references the template', async () => {
    const { auth } = makeAuth({ id: TEMPLATE_ID }, [])

    const result = await getEmailTemplateUsage(auth, 'welcome')

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ campaigns: 0, campaignNames: [] })
  })

  it('counts N referencing campaigns and returns their names', async () => {
    const { auth, rec } = makeAuth({ id: TEMPLATE_ID }, [
      { display_name: 'Warsztaty' },
      { display_name: '  Newsletter  ' },
      { display_name: null },
    ])

    const result = await getEmailTemplateUsage(auth, 'welcome')

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({
      campaigns: 3,
      campaignNames: ['Warsztaty', 'Newsletter'],
    })
    // Campaign rows are keyed by the resolved template id (reverse FK).
    expect(rec.campaignEqArgs).toContainEqual(['email_template_id', TEMPLATE_ID])
  })

  it('resolves the template id scoped to the caller tenant', async () => {
    const { auth, rec } = makeAuth({ id: TEMPLATE_ID }, [{ display_name: 'X' }])

    await getEmailTemplateUsage(auth, 'venture_bonus')

    expect(rec.templateEqArgs).toContainEqual(['tenant_id', TENANT])
    expect(rec.templateEqArgs).toContainEqual(['type', 'venture_bonus'])
  })

  it('returns 0 (no campaign query) when the tenant has no stored template row', async () => {
    const { auth, rec } = makeAuth(null, [{ display_name: 'X' }])

    const result = await getEmailTemplateUsage(auth, 'welcome')

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ campaigns: 0, campaignNames: [] })
    // No template id → the reverse-FK lookup is skipped entirely.
    expect(rec.campaignEqArgs).toHaveLength(0)
  })
})
