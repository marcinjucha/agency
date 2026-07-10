import { describe, expect, it } from 'vitest'
import { UNSCOPED_ROLES } from '@/lib/roles'
import {
  deriveClientAccess,
  isUnscopedAccess,
  isUnscopedRoleName,
  showClientPicker,
  UNSCOPED_ROLE_NAMES,
} from '../utils/client-access'

describe('isUnscopedRoleName (keyed on users.role)', () => {
  it('treats owner and admin as unscoped', () => {
    expect(isUnscopedRoleName('owner')).toBe(true)
    expect(isUnscopedRoleName('admin')).toBe(true)
  })

  it('treats member and custom scoped roles as scoped', () => {
    expect(isUnscopedRoleName('member')).toBe(false)
    expect(isUnscopedRoleName('editor')).toBe(false)
    expect(isUnscopedRoleName('Redaktor')).toBe(false)
  })

  it('is EXACT match — mirrors the server predicate (no trim/lowercase, LOW-2)', () => {
    // The UI must never treat a value the server considers scoped as unscoped.
    // isUnscopedActor uses FULL_ACCESS_ROLES.has(roleName ?? '') — exact match.
    expect(isUnscopedRoleName('  OWNER ')).toBe(false)
    expect(isUnscopedRoleName('Admin')).toBe(false)
    expect(isUnscopedRoleName('OWNER')).toBe(false)
  })

  it('returns false for null / undefined / empty', () => {
    expect(isUnscopedRoleName(null)).toBe(false)
    expect(isUnscopedRoleName(undefined)).toBe(false)
    expect(isUnscopedRoleName('')).toBe(false)
  })

  it('mirrors the canonical unscoped role set (ARCH-1 — imports lib/roles)', () => {
    // Imports the canonical source, NOT a re-hardcoded literal — a future 3rd
    // unscoped role added in lib/roles.ts propagates here (and to the server)
    // without a silent drift.
    expect([...UNSCOPED_ROLE_NAMES].sort()).toEqual([...UNSCOPED_ROLES].sort())
  })
})

describe('isUnscopedAccess (is_super_admin OR users.role in owner/admin)', () => {
  it('is unscoped when the user is a super admin regardless of role', () => {
    expect(isUnscopedAccess({ isSuperAdmin: true, role: 'member' })).toBe(true)
    expect(isUnscopedAccess({ isSuperAdmin: true, role: null })).toBe(true)
  })

  it('is unscoped for an owner/admin users.role when not super admin', () => {
    expect(isUnscopedAccess({ isSuperAdmin: false, role: 'owner' })).toBe(true)
    expect(isUnscopedAccess({ isSuperAdmin: false, role: 'admin' })).toBe(true)
  })

  it('is scoped for a member role and no super admin', () => {
    expect(isUnscopedAccess({ isSuperAdmin: false, role: 'member' })).toBe(false)
    expect(isUnscopedAccess({ isSuperAdmin: false, role: null })).toBe(false)
  })
})

describe('deriveClientAccess (toggle prefill from users.role)', () => {
  it("maps unscoped users.role / super admin to 'all'", () => {
    expect(deriveClientAccess({ isSuperAdmin: false, role: 'owner' })).toBe('all')
    expect(deriveClientAccess({ isSuperAdmin: false, role: 'admin' })).toBe('all')
    expect(deriveClientAccess({ isSuperAdmin: true, role: 'member' })).toBe('all')
  })

  it("maps a scoped member / custom role to 'selected'", () => {
    expect(deriveClientAccess({ isSuperAdmin: false, role: 'member' })).toBe('selected')
    expect(deriveClientAccess({ isSuperAdmin: false, role: null })).toBe('selected')
  })
})

describe('showClientPicker (editor picker visibility from toggle)', () => {
  it("shows the picker only for a 'selected' toggle and a non-super-admin", () => {
    expect(showClientPicker('selected', false)).toBe(true)
  })

  it("hides the picker for an 'all' toggle", () => {
    expect(showClientPicker('all', false)).toBe(false)
  })

  it('hides the picker for a super admin regardless of the toggle', () => {
    expect(showClientPicker('selected', true)).toBe(false)
    expect(showClientPicker('all', true)).toBe(false)
  })
})
