/**
 * Tests for the client-access → users.role mapping (iter-3c).
 *
 * These pure functions back the CREATE (insertUserRow) and UPDATE
 * (writeUserRoleFromClientAccess) writes in server.ts — the DB code is a thin
 * neverthrow wrapper around the decisions asserted here. Testing the pure logic
 * directly avoids the createServerFn RPC pipeline (same rationale as the venture
 * handler tests targeting pure handlers).
 */
import { describe, expect, it } from 'vitest'
import { clientAccessToRole, nextRoleOnUpdate } from '../utils/role-mapping'

describe('clientAccessToRole (CREATE)', () => {
  it("maps 'all' to admin (unscoped — sees every client)", () => {
    // createUser with clientAccess='all' → users.role='admin'
    expect(clientAccessToRole('all')).toBe('admin')
  })

  it("maps 'selected' to member (scoped — assigned clients only)", () => {
    // createUser with clientAccess='selected' → users.role='member'
    expect(clientAccessToRole('selected')).toBe('member')
  })

  it('never mints an owner on create', () => {
    // Exhaustive over the toggle — CMS create only ever yields admin | member.
    const roles = (['all', 'selected'] as const).map(clientAccessToRole)
    expect(roles).not.toContain('owner')
  })
})

describe('nextRoleOnUpdate (UPDATE — owner-preserving)', () => {
  it("preserves a seeded 'owner' — returns null (no write) for either toggle", () => {
    expect(nextRoleOnUpdate('owner', 'all')).toBeNull()
    expect(nextRoleOnUpdate('owner', 'selected')).toBeNull()
  })

  it('flips member ↔ admin correctly', () => {
    // member → 'all' promotes to admin (unscoped)
    expect(nextRoleOnUpdate('member', 'all')).toBe('admin')
    // admin → 'selected' demotes to member (scoped)
    expect(nextRoleOnUpdate('admin', 'selected')).toBe('member')
    // idempotent flips
    expect(nextRoleOnUpdate('member', 'selected')).toBe('member')
    expect(nextRoleOnUpdate('admin', 'all')).toBe('admin')
  })

  it('maps a custom / null current role from the toggle (owner is the only guard)', () => {
    expect(nextRoleOnUpdate('editor', 'all')).toBe('admin')
    expect(nextRoleOnUpdate(null, 'selected')).toBe('member')
  })
})
