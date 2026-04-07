import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  filterPermissionsByFeatures,
  getRequiredPermission,
  isFeatureEnabled,
  validatePermissionKeys,
  validateParentKeys,
  getRouteFeature,
  expandPermissionKeys,
  type PermissionKey,
  type ParentKey,
} from '../permissions'

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe('hasPermission', () => {
  it('returns true for always-granted key (dashboard) even with empty granted set', () => {
    expect(hasPermission('dashboard', [])).toBe(true)
  })

  it('returns true for always-granted key regardless of granted set contents', () => {
    expect(hasPermission('dashboard', ['surveys'])).toBe(true)
  })

  it('returns true on exact match', () => {
    expect(hasPermission('shop.products', ['shop.products'])).toBe(true)
  })

  it('returns true when parent key grants child (prefix match)', () => {
    expect(hasPermission('shop.products', ['shop'])).toBe(true)
  })

  it('returns false when no match', () => {
    expect(hasPermission('surveys', ['content', 'shop'])).toBe(false)
  })

  it('returns false when child key does NOT grant parent', () => {
    expect(hasPermission('shop', ['shop.products'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hasAnyPermission
// ---------------------------------------------------------------------------

describe('hasAnyPermission', () => {
  it('returns true if ANY required key matches', () => {
    expect(hasAnyPermission(['surveys', 'shop'], ['shop'])).toBe(true)
  })

  it('returns false if NONE match', () => {
    expect(hasAnyPermission(['surveys', 'intake'], ['shop'])).toBe(false)
  })

  it('returns false for empty required array', () => {
    expect(hasAnyPermission([], ['shop'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// filterPermissionsByFeatures
// ---------------------------------------------------------------------------

describe('filterPermissionsByFeatures', () => {
  it('passes through exact match', () => {
    const result = filterPermissionsByFeatures(['surveys'], ['surveys'])
    expect(result).toEqual(['surveys'])
  })

  it('parent key enables all children', () => {
    const result = filterPermissionsByFeatures(
      ['shop.products', 'shop.categories', 'shop.marketplace'],
      ['shop'],
    )
    expect(result).toEqual(['shop.products', 'shop.categories', 'shop.marketplace'])
  })

  it('child key makes parent group visible', () => {
    const result = filterPermissionsByFeatures(['content'], ['content.blog'])
    expect(result).toEqual(['content'])
  })

  it('filters out unrelated keys', () => {
    const result = filterPermissionsByFeatures(
      ['surveys', 'intake', 'shop.products'],
      ['surveys'],
    )
    expect(result).toEqual(['surveys'])
  })

  it('returns empty array when enabledFeatures is empty', () => {
    const result = filterPermissionsByFeatures(['surveys', 'shop'], [])
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getRequiredPermission
// ---------------------------------------------------------------------------

describe('getRequiredPermission', () => {
  it('returns dashboard for /admin exact path', () => {
    expect(getRequiredPermission('/admin')).toBe('dashboard')
  })

  it('returns correct permission for known route', () => {
    expect(getRequiredPermission('/admin/surveys')).toBe('surveys')
    expect(getRequiredPermission('/admin/shop/products')).toBe('shop.products')
  })

  it('uses longest prefix match for nested paths', () => {
    expect(getRequiredPermission('/admin/shop/products/new')).toBe('shop.products')
  })

  it('returns null for unknown path', () => {
    expect(getRequiredPermission('/api/something')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isFeatureEnabled
// ---------------------------------------------------------------------------

describe('isFeatureEnabled', () => {
  it('returns true when route has no feature mapping (dashboard)', () => {
    expect(isFeatureEnabled('/admin', [])).toBe(true)
  })

  it('returns true when parent feature is enabled', () => {
    expect(isFeatureEnabled('/admin/shop/products', ['shop'])).toBe(true)
  })

  it('returns false when feature is disabled', () => {
    expect(isFeatureEnabled('/admin/shop/products', ['surveys'])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validatePermissionKeys
// ---------------------------------------------------------------------------

describe('validatePermissionKeys', () => {
  it('passes through valid keys', () => {
    const result = validatePermissionKeys(['surveys', 'shop.products'])
    expect(result).toEqual(['surveys', 'shop.products'])
  })

  it('filters out invalid/typo keys', () => {
    const result = validatePermissionKeys(['surveys', 'shop.produts', 'nonexistent'])
    expect(result).toEqual(['surveys'])
  })
})

// ---------------------------------------------------------------------------
// validateParentKeys
// ---------------------------------------------------------------------------

describe('validateParentKeys', () => {
  it('passes through valid parent keys', () => {
    const result = validateParentKeys(['shop', 'surveys'])
    expect(result).toEqual(['shop', 'surveys'])
  })

  it('rejects child keys', () => {
    const result = validateParentKeys(['shop.products', 'surveys'])
    expect(result).toEqual(['surveys'])
  })

  it('rejects non-string values', () => {
    const result = validateParentKeys([42, null, 'shop'])
    expect(result).toEqual(['shop'])
  })
})

// ---------------------------------------------------------------------------
// getRouteFeature
// ---------------------------------------------------------------------------

describe('getRouteFeature', () => {
  it('returns parent key for known route', () => {
    expect(getRouteFeature('/admin/shop/products')).toBe('shop')
    expect(getRouteFeature('/admin/blog')).toBe('content')
  })

  it('returns null for unknown route', () => {
    expect(getRouteFeature('/admin')).toBeNull()
    expect(getRouteFeature('/api/something')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// expandPermissionKeys
// ---------------------------------------------------------------------------

describe('expandPermissionKeys', () => {
  it('expands parent key to include all children', () => {
    const result = expandPermissionKeys(['shop'])
    expect(result).toEqual(
      expect.arrayContaining(['shop', 'shop.products', 'shop.categories', 'shop.marketplace']),
    )
    expect(result).toHaveLength(4)
  })

  it('keeps child key as-is without expanding', () => {
    const result = expandPermissionKeys(['content.blog'])
    expect(result).toEqual(['content.blog'])
  })

  it('deduplicates when parent and child are both provided', () => {
    const result = expandPermissionKeys(['shop', 'shop.products'])
    const unique = new Set(result)
    expect(unique.size).toBe(result.length)
    expect(result).toEqual(
      expect.arrayContaining(['shop', 'shop.products', 'shop.categories', 'shop.marketplace']),
    )
  })

  it('returns empty array for empty input', () => {
    expect(expandPermissionKeys([])).toEqual([])
  })

  it('keeps key with no children as-is', () => {
    const result = expandPermissionKeys(['dashboard'])
    expect(result).toEqual(['dashboard'])
  })
})
