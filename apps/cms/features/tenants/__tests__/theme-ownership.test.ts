/**
 * Cross-tenant base-theme write guard (P2) — tenants.theme_id.
 *
 * Tenant editing is super-admin, but the tenants.theme_id FK accepts ANY
 * tenant's so_themes.id and the bonus-email path reads so_themes via the
 * service-role client (bypasses RLS). So a non-null base theme_id must be
 * verified to belong to the tenant being edited BEFORE any write; a mismatch is
 * rejected (never silently nulled). NULL ("unset base") skips the lookup.
 *
 * The guard `assertThemeOwnedByTenant` is unit-tested directly (a pure
 * ResultAsync over the mocked service client) — the createServerFn wrapper does
 * not round-trip failure results cleanly in-process. One wrapper success test
 * proves the guard is wired into updateTenantFn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { messages } from '@/lib/messages'

vi.mock('@/lib/supabase/server-start.server', () => ({ createServerClient: () => ({}) }))

const serviceClient: { from: ReturnType<typeof vi.fn> } = { from: vi.fn() }
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => serviceClient }))

vi.mock('@/lib/server-auth.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server-auth.server')>()
  return { ...actual, requireAuthContextFull: vi.fn() }
})

import { requireAuthContextFull } from '@/lib/server-auth.server'
import { assertThemeOwnedByTenant, createTenantFn, updateTenantFn } from '../server'

const mockAuth = requireAuthContextFull as ReturnType<typeof vi.fn>
const TENANT_ID = '11111111-1111-1111-1111-111111111111'
const THEME_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

/** Chainable stub that resolves .maybeSingle()/.single() to `value`. */
function chain(value: unknown) {
  const c: Record<string, unknown> = {}
  const self = () => c
  c.select = vi.fn(self)
  c.update = vi.fn(self)
  c.eq = vi.fn(self)
  c.maybeSingle = vi.fn(() => Promise.resolve(value))
  c.single = vi.fn(() => Promise.resolve(value))
  return c as {
    select: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: () => Promise<unknown>
    single: () => Promise<unknown>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('assertThemeOwnedByTenant (guard)', () => {
  it('rejects a theme_id NOT owned by the tenant (foreign/absent → null)', async () => {
    const soThemes = chain({ data: null, error: null })
    serviceClient.from.mockReturnValue(soThemes)

    const result = await assertThemeOwnedByTenant(TENANT_ID, THEME_ID)

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe(messages.common.noPermission)
    // Verified under the target tenant, by id.
    expect(soThemes.eq).toHaveBeenCalledWith('id', THEME_ID)
    expect(soThemes.eq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('resolves ok when the theme belongs to the tenant', async () => {
    serviceClient.from.mockReturnValue(chain({ data: { id: THEME_ID }, error: null }))

    const result = await assertThemeOwnedByTenant(TENANT_ID, THEME_ID)

    expect(result.isOk()).toBe(true)
  })

  it('skips the lookup and resolves ok when theme_id is null (unset base)', async () => {
    const result = await assertThemeOwnedByTenant(TENANT_ID, null)

    expect(result.isOk()).toBe(true)
    expect(serviceClient.from).not.toHaveBeenCalled()
  })

  it('skips the lookup when theme_id is undefined', async () => {
    const result = await assertThemeOwnedByTenant(TENANT_ID, undefined)

    expect(result.isOk()).toBe(true)
    expect(serviceClient.from).not.toHaveBeenCalled()
  })
})

// One wrapper test proves the guard is actually wired into updateTenantFn: with
// an OWNED theme, the flow passes the guard and reaches the tenants update. (A
// success result round-trips cleanly in-process; the failure path is covered by
// the direct guard tests above.)
describe('updateTenantFn wiring — owned theme reaches the update', () => {
  const FORM = {
    name: 'Acme',
    email: 'acme@example.com',
    domain: null,
    subscription_status: 'trial' as const,
    enabled_features: ['dashboard'],
  }

  it('proceeds to the tenants update when the base theme_id belongs to the tenant', async () => {
    mockAuth.mockReturnValue(
      okAsync({
        supabase: {},
        userId: 'super-1',
        tenantId: TENANT_ID,
        isSuperAdmin: true,
        roleName: 'owner',
        permissions: [],
      }),
    )
    const soThemes = chain({ data: { id: THEME_ID }, error: null })
    // Two sequential 'tenants' hits: fetchOldEnabledFeatures then updateTenantRow.
    const tenantsQueue = [
      chain({ data: { enabled_features: ['dashboard'] }, error: null }),
      chain({ data: { id: TENANT_ID, name: 'Acme', enabled_features: ['dashboard'] }, error: null }),
    ]
    let tenantsIdx = 0
    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'so_themes') return soThemes
      if (table === 'tenants') return tenantsQueue[tenantsIdx++] ?? tenantsQueue[1]
      throw new Error(`unexpected table ${table}`)
    })

    await (updateTenantFn as (a: unknown) => Promise<unknown>)({
      data: { id: TENANT_ID, data: { ...FORM, theme_id: THEME_ID } },
    })

    // Guard verified the theme under the tenant, then the update ran.
    expect(soThemes.eq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
    expect(tenantsQueue[1].update).toHaveBeenCalled()
  })
})

// A brand-new tenant owns no themes yet, so createTenantFn must REJECT any
// non-null theme_id (mirrors updateTenantFn's ownership guard). Otherwise a
// super-admin picking a theme from the New-Tenant form's caller-scoped picker
// would persist a FOREIGN theme_id → foreign brand on the new tenant's mail.
describe('createTenantFn theme guard', () => {
  const FORM = {
    name: 'Acme',
    email: 'acme@example.com',
    domain: null,
    subscription_status: 'trial' as const,
    enabled_features: ['dashboard'],
  }

  function superAdmin() {
    mockAuth.mockReturnValue(
      okAsync({
        supabase: {},
        userId: 'super-1',
        tenantId: TENANT_ID,
        isSuperAdmin: true,
        roleName: 'owner',
        permissions: [],
      }),
    )
  }

  it('rejects a non-null theme_id and never inserts', async () => {
    superAdmin()

    // The createServerFn wrapper does not round-trip a failure VALUE in-process
    // (same as the updateTenantFn header note) — the noPermission rejection
    // propagates as a throw. Either way, the guard blocks BEFORE any DB access.
    await expect(
      (createTenantFn as (a: unknown) => Promise<unknown>)({
        data: { ...FORM, theme_id: THEME_ID },
      }),
    ).rejects.toThrow(messages.common.noPermission)

    expect(serviceClient.from).not.toHaveBeenCalled()
  })

  it('creates the tenant with theme_id null when none is provided', async () => {
    superAdmin()

    const tenantsInsert = {
      insert: vi.fn(() => tenantsInsert),
      select: vi.fn(() => tenantsInsert),
      single: vi.fn(() =>
        Promise.resolve({ data: { id: 'new-tenant', name: 'Acme' }, error: null }),
      ),
    }
    const rolesChain = {
      insert: vi.fn(() => rolesChain),
      select: vi.fn(() =>
        Promise.resolve({
          data: [
            { id: 'r-admin', name: 'Admin' },
            { id: 'r-member', name: 'Member' },
          ],
          error: null,
        }),
      ),
    }
    const rolePermsChain = { insert: vi.fn(() => Promise.resolve({ error: null })) }

    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'tenants') return tenantsInsert
      if (table === 'tenant_roles') return rolesChain
      if (table === 'role_permissions') return rolePermsChain
      throw new Error(`unexpected table ${table}`)
    })

    await (createTenantFn as (a: unknown) => Promise<unknown>)({ data: { ...FORM } })

    expect(serviceClient.from).toHaveBeenCalledWith('tenants')
    expect(tenantsInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ theme_id: null }),
    )
  })
})
