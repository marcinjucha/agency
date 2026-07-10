import { describe, it, expect } from 'vitest'
import { FULL_ACCESS_ROLES, isUnscopedActor } from '../server-auth.server'

// ---------------------------------------------------------------------------
// FULL_ACCESS_ROLES ⇄ SQL parity (LOW / safety net)
//
// FULL_ACCESS_ROLES must stay byte-for-byte in parity with the SQL role list
// in supabase/migrations/20260709120000_venture_scoped_access.sql:
//   - can_access_so_client()              → current_user_role() IN ('owner','admin')
//   - so_clients INSERT / DELETE WITH CHECK/USING → current_user_role() IN ('owner','admin')
//   - so_client_assignments manage/read    → current_user_role() IN ('owner','admin')
//
// There is no shared runtime between the RLS (SQL) layer and this app layer, so
// the duplication is unavoidable. This test fails CI on any TS-side change to the
// set — the failure message is the reminder to make the reciprocal SQL edit (and
// vice-versa: the migration carries the matching comment pointing back here).
// ---------------------------------------------------------------------------

describe('FULL_ACCESS_ROLES SQL parity', () => {
  it('equals exactly the SQL role list { owner, admin }', () => {
    // Order-independent set equality (size + membership).
    expect(FULL_ACCESS_ROLES.size).toBe(2)
    expect(FULL_ACCESS_ROLES.has('owner')).toBe(true)
    expect(FULL_ACCESS_ROLES.has('admin')).toBe(true)
    expect([...FULL_ACCESS_ROLES].sort()).toEqual(['admin', 'owner'])
  })

  it('does NOT include scoped roles (member) — those are the SCOPED actors', () => {
    expect(FULL_ACCESS_ROLES.has('member')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isUnscopedActor — single source of the unscoped-actor predicate consumed by
// getAuthFull (permission grant) AND the venture admin handlers (client
// create/delete gate). Locks the exact boolean semantics.
// ---------------------------------------------------------------------------

describe('isUnscopedActor', () => {
  it('is true for owner and admin (FULL_ACCESS_ROLES), super_admin false', () => {
    expect(isUnscopedActor({ isSuperAdmin: false, roleName: 'owner' })).toBe(true)
    expect(isUnscopedActor({ isSuperAdmin: false, roleName: 'admin' })).toBe(true)
  })

  it('is true for a super_admin regardless of role (incl. a scoped role or null)', () => {
    expect(isUnscopedActor({ isSuperAdmin: true, roleName: 'member' })).toBe(true)
    expect(isUnscopedActor({ isSuperAdmin: true, roleName: null })).toBe(true)
  })

  it('is false for a scoped member (not super_admin)', () => {
    expect(isUnscopedActor({ isSuperAdmin: false, roleName: 'member' })).toBe(false)
  })

  it('is false for a null role (not super_admin) — null coerces to the empty string, never in the set', () => {
    expect(isUnscopedActor({ isSuperAdmin: false, roleName: null })).toBe(false)
  })
})
