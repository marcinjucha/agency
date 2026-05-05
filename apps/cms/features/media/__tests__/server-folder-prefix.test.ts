/**
 * Tests for getUploadFolderPrefix — pure helper that derives the S3 folder
 * prefix for a tenant's uploads.
 *
 * Halo Efekt's prefix is preserved for legacy continuity ('haloefekt/media').
 * All other tenants are isolated under 'tenants/{tenantId}/media'.
 *
 * Background: existing rows in the DB store absolute S3 URLs, so changing
 * the prefix for new uploads is non-breaking. The legacy carve-out for
 * Halo Efekt is purely operational — keeps new uploads next to the
 * existing team's files in S3.
 */
import { describe, it, expect } from 'vitest'
import { getUploadFolderPrefix, HALOEFEKT_TENANT_ID } from '../server'

describe('getUploadFolderPrefix', () => {
  it('returns legacy prefix for Halo Efekt tenant (preserves existing S3 layout)', () => {
    expect(getUploadFolderPrefix(HALOEFEKT_TENANT_ID)).toBe('haloefekt/media')
  })

  it('returns per-tenant isolated prefix for other tenants', () => {
    expect(getUploadFolderPrefix('other-tenant-uuid-12345-abc')).toBe(
      'tenants/other-tenant-uuid-12345-abc/media'
    )
  })

  it('returns per-tenant isolated prefix for arbitrary UUIDs that are not Halo Efekt', () => {
    const otherUuid = '00000000-0000-0000-0000-000000000001'
    expect(getUploadFolderPrefix(otherUuid)).toBe(`tenants/${otherUuid}/media`)
  })

  it('does case-sensitive comparison — UUIDs differing in case do not match Halo Efekt carve-out', () => {
    // HALOEFEKT_TENANT_ID is lowercase; uppercase variant must NOT collapse into legacy prefix
    const upperVariant = HALOEFEKT_TENANT_ID.toUpperCase()
    expect(getUploadFolderPrefix(upperVariant)).toBe(`tenants/${upperVariant}/media`)
  })

  it('does not match a substring of the Halo Efekt UUID', () => {
    // Substring of Halo Efekt UUID — must not accidentally trigger legacy carve-out
    const substring = HALOEFEKT_TENANT_ID.slice(0, 16)
    expect(getUploadFolderPrefix(substring)).toBe(`tenants/${substring}/media`)
  })
})
