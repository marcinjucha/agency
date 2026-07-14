/**
 * Tests for buildTenantPayload (iter D3b — theme assignment).
 *
 * Pure payload-builder: the tenant base theme (tenants.theme_id) must survive
 * into the DB write, and default to null when the form omits it (unset base →
 * HALO_EFEKT_DEFAULT at resolution).
 */
import { describe, it, expect, vi } from 'vitest'

// server.ts pulls in the service/server Supabase clients at module load; stub
// them so importing the pure payload builder doesn't touch real env/config.
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({}) }))
vi.mock('@/lib/supabase/server-start.server', () => ({ createServerClient: () => ({}) }))

import { buildTenantPayload } from '../server'
import type { TenantFormData } from '../types'

const BASE: TenantFormData = {
  name: 'Acme',
  email: 'acme@example.com',
  domain: null,
  subscription_status: 'trial',
  enabled_features: ['dashboard'],
}

describe('buildTenantPayload — theme_id', () => {
  it('includes theme_id when a uuid is provided', () => {
    const themeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const payload = buildTenantPayload({ ...BASE, theme_id: themeId })
    expect(payload.theme_id).toBe(themeId)
  })

  it('defaults theme_id to null when omitted (unset base theme)', () => {
    const payload = buildTenantPayload(BASE)
    expect(payload.theme_id).toBeNull()
  })

  it('coerces an explicit null theme_id to null', () => {
    const payload = buildTenantPayload({ ...BASE, theme_id: null })
    expect(payload.theme_id).toBeNull()
  })
})
