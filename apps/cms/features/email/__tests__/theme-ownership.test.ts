import { describe, it, expect, vi } from 'vitest'
import { messages } from '@/lib/messages'
import { assertThemeOwnedIfPresent } from '../server'
import type { AuthContext } from '@/lib/server-auth.server'

// ---------------------------------------------------------------------------
// assertThemeOwnedIfPresent — email save-path cross-tenant theme guard.
//
// SECURITY (same bug class as the venture client-theming cross-tenant leak): a
// per-template `theme_id` must belong to the caller's tenant before it is
// persisted. NULL is always allowed (inherit); a non-null id that does not
// resolve under the tenant is rejected with the no-permission error — never
// silently nulled. Mirrors features/venture/admin-handlers.server.ts.
//
// The check runs ONE query: so_themes .select('id').eq('id').eq('tenant_id')
// .maybeSingle(). A self-referencing builder mock satisfies the chain.
// ---------------------------------------------------------------------------

const TENANT = 'tenant-1'

function makeAuth(themeRes: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(themeRes)),
  }
  const from = vi.fn(() => builder)
  const auth = { supabase: { from }, tenantId: TENANT, userId: 'u1' } as unknown as AuthContext
  return { auth, from, builder }
}

describe('assertThemeOwnedIfPresent', () => {
  it('allows a null theme_id (inherit) WITHOUT querying the DB', async () => {
    const { auth, from } = makeAuth({ data: null, error: null })
    const result = await assertThemeOwnedIfPresent(auth, null)
    expect(result.isOk()).toBe(true)
    expect(from).not.toHaveBeenCalled()
  })

  it('allows a theme_id owned by the caller tenant', async () => {
    const { auth, from, builder } = makeAuth({ data: { id: 'theme-1' }, error: null })
    const result = await assertThemeOwnedIfPresent(auth, 'theme-1')
    expect(result.isOk()).toBe(true)
    expect(from).toHaveBeenCalledWith('so_themes')
    expect(builder.eq).toHaveBeenCalledWith('id', 'theme-1')
    expect(builder.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })

  it('REJECTS a foreign-tenant (or missing) theme_id with the no-permission error', async () => {
    // Row scoped by id + tenant_id returns null → belongs to another tenant OR
    // does not exist; both forbidden, indistinguishable.
    const { auth } = makeAuth({ data: null, error: null })
    const result = await assertThemeOwnedIfPresent(auth, 'foreign-theme')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe(messages.common.noPermission)
  })

  it('surfaces a DB error as a Result error (never throws)', async () => {
    // A raw PostgREST error object is not an Error instance → dbError maps it to
    // the generic unknown-error message (developer detail logged, not leaked).
    const { auth } = makeAuth({ data: null, error: { message: 'boom' } })
    const result = await assertThemeOwnedIfPresent(auth, 'theme-1')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe(messages.common.unknownError)
  })
})
