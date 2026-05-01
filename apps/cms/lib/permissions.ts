/**
 * Type-safe RBAC permission system.
 *
 * WHY typed union (not plain strings): PermissionKey is derived from PERMISSION_GROUPS
 * via const assertion. TypeScript will error on typos like 'shop.produts' — DB stores
 * TEXT but we validate/filter against ALL_PERMISSION_KEYS at the boundary.
 *
 * WHY prefix matching: Parent key 'shop' grants all children ('shop.products', etc.).
 * This lets admins assign broad access without listing every child key.
 */

// ---------------------------------------------------------------------------
// 1. Permission Groups — single source of truth
// ---------------------------------------------------------------------------

const PERMISSION_GROUPS = {
  dashboard: { key: 'dashboard', children: [] as const, alwaysGranted: true },
  surveys: { key: 'surveys', children: [] as const },
  intake: { key: 'intake', children: [] as const },
  calendar: { key: 'calendar', children: [] as const },
  content: {
    key: 'content',
    children: [
      'content.landing_page',
      'content.blog',
      'content.media',
      'content.legal_pages',
    ] as const,
  },
  shop: {
    key: 'shop',
    children: [
      'shop.products',
      'shop.categories',
      'shop.marketplace',
    ] as const,
  },
  workflows: {
    key: 'workflows',
    children: ['workflows.executions', 'workflows.execute'] as const,
  },
  system: {
    key: 'system',
    children: [
      'system.email_templates',
      'system.settings',
      'system.users',
      'system.roles',
      'system.tenants',
      'system.docforge_licenses',
    ] as const,
  },
} as const

// ---------------------------------------------------------------------------
// 2. Derived types — compiler-enforced, not hand-maintained
// ---------------------------------------------------------------------------

type PermissionGroupMap = typeof PERMISSION_GROUPS

/** Top-level permission group keys (e.g. 'dashboard', 'system'). */
export type ParentKey = PermissionGroupMap[keyof PermissionGroupMap]['key']
type ChildKey = PermissionGroupMap[keyof PermissionGroupMap]['children'][number]

/** Union of all valid permission keys. TypeScript errors on invalid strings. */
export type PermissionKey = ParentKey | ChildKey

/** All parent keys as a constant array — used for feature flag mapping. */
export const PARENT_KEYS: readonly ParentKey[] = Object.values(PERMISSION_GROUPS).map(
  (g) => g.key as ParentKey,
)

// ---------------------------------------------------------------------------
// 3. Derived constants
// ---------------------------------------------------------------------------

/** All valid permission keys, derived programmatically from PERMISSION_GROUPS. */
export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(
  PERMISSION_GROUPS,
).flatMap((group) => [group.key as PermissionKey, ...group.children])

/** Keys identifying groups where alwaysGranted is true. */
const ALWAYS_GRANTED_KEYS: ReadonlySet<PermissionKey> = new Set(
  Object.values(PERMISSION_GROUPS)
    .filter((g) => 'alwaysGranted' in g && g.alwaysGranted)
    .map((g) => g.key as PermissionKey),
)

/** Default permissions for a new team member (no admin/system access). */
export const DEFAULT_MEMBER_PERMISSIONS: PermissionKey[] = [
  'dashboard',
  'surveys',
  'intake',
  'calendar',
  'content.blog',
  'content.media',
  'workflows',
  'workflows.executions',
]

// ---------------------------------------------------------------------------
// 4. Permission check utilities
// ---------------------------------------------------------------------------

/**
 * Check if `required` permission is satisfied by the `granted` set.
 *
 * Rules:
 * - Always-granted keys (dashboard) return true regardless of granted set
 * - Exact match: 'shop.products' in granted → true
 * - Prefix match: 'shop' in granted → 'shop.products' also granted
 */
export function hasPermission(
  required: PermissionKey,
  granted: readonly PermissionKey[],
): boolean {
  if (ALWAYS_GRANTED_KEYS.has(required)) return true
  return granted.some(
    (p) => required === p || required.startsWith(p + '.'),
  )
}

/** Returns true if ANY of the required permissions is satisfied. */
export function hasAnyPermission(
  required: readonly PermissionKey[],
  granted: readonly PermissionKey[],
): boolean {
  return required.some((r) => hasPermission(r, granted))
}

/**
 * Filter permission keys to only those enabled in the tenant's feature list.
 * Used to show accurate permission counts — excludes permissions from disabled features.
 *
 * enabledFeatures is now PermissionKey[] (granular). A permission is enabled if:
 * - Exact match in enabledFeatures
 * - Parent key is in enabledFeatures (prefix match: 'shop' enables 'shop.products')
 * - Any sibling from the same parent group is enabled (if 'content.blog' is enabled, the group exists)
 */
export function filterPermissionsByFeatures(
  permissions: PermissionKey[],
  enabledFeatures: PermissionKey[],
): PermissionKey[] {
  const enabledSet = new Set<string>(enabledFeatures)
  return permissions.filter((key) => {
    // Exact match
    if (enabledSet.has(key)) return true
    // Parent key in enabled set (prefix match)
    const dotIndex = key.indexOf('.')
    if (dotIndex !== -1) {
      const parent = key.substring(0, dotIndex)
      if (enabledSet.has(parent)) return true
    }
    // Check if key is a parent and any child is enabled
    if (dotIndex === -1) {
      return enabledFeatures.some((f) => f.startsWith(key + '.'))
    }
    return false
  })
}

// ---------------------------------------------------------------------------
// 5. Route → Permission mapping
// ---------------------------------------------------------------------------

/** Maps CMS route prefixes to the permission key required to access them. */
export const ROUTE_PERMISSION_MAP: Record<string, PermissionKey> = {
  '/admin/surveys': 'surveys',
  '/admin/intake': 'intake',
  '/admin/calendar': 'calendar',
  '/admin/landing-page': 'content.landing_page',
  '/admin/blog': 'content.blog',
  '/admin/media': 'content.media',
  '/admin/legal-pages': 'content.legal_pages',
  '/admin/shop/products': 'shop.products',
  '/admin/shop/categories': 'shop.categories',
  '/admin/shop/marketplace': 'shop.marketplace',
  '/admin/workflows': 'workflows',
  '/admin/email-templates': 'system.email_templates',
  '/admin/settings': 'system.settings',
  '/admin/users': 'system.users',
  '/admin/roles': 'system.roles',
  '/admin/tenants': 'system.tenants',
  '/admin/docforge/licenses': 'system.docforge_licenses',
}

/**
 * Find the permission required for a given pathname.
 *
 * Uses longest-prefix matching so `/admin/shop/products/new` matches
 * `/admin/shop/products` (not `/admin/shop`).
 *
 * Returns 'dashboard' for `/admin` exact match.
 * Returns null for paths with no restriction (public, API, etc.).
 */
export function getRequiredPermission(pathname: string): PermissionKey | null {
  if (pathname === '/admin') return 'dashboard'

  // Sort by path length descending — longest prefix wins
  const sorted = Object.entries(ROUTE_PERMISSION_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  )

  for (const [path, permission] of sorted) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return permission
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// 6. Route → Feature mapping (tenant feature flags)
// ---------------------------------------------------------------------------

/**
 * Maps CMS route prefixes to the parent feature key that must be enabled
 * for the route to appear in the sidebar.
 *
 * WHY parent key (not child permission key): Feature flags operate at the
 * module level — a tenant either has "shop" or doesn't. Fine-grained
 * permissions (shop.products vs shop.categories) are a separate layer.
 */
export const ROUTE_FEATURE_MAP: Record<string, ParentKey> = {
  '/admin/surveys': 'surveys',
  '/admin/intake': 'intake',
  '/admin/calendar': 'calendar',
  '/admin/landing-page': 'content',
  '/admin/blog': 'content',
  '/admin/media': 'content',
  '/admin/legal-pages': 'content',
  '/admin/shop/products': 'shop',
  '/admin/shop/categories': 'shop',
  '/admin/shop/marketplace': 'shop',
  '/admin/workflows': 'workflows',
  '/admin/email-templates': 'system',
  '/admin/settings': 'system',
  '/admin/users': 'system',
  '/admin/roles': 'system',
  '/admin/tenants': 'system',
  '/admin/docforge/licenses': 'system',
}

/**
 * Returns the parent feature key for a given pathname, or null if
 * the route has no feature mapping (e.g. dashboard, API routes).
 *
 * Uses longest-prefix matching (same strategy as getRequiredPermission).
 */
export function getRouteFeature(pathname: string): ParentKey | null {
  const sorted = Object.entries(ROUTE_FEATURE_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  )

  for (const [path, feature] of sorted) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return feature
    }
  }

  return null
}

/**
 * Checks if a route's feature is enabled for the tenant.
 *
 * Returns true if:
 * - Route has no feature mapping (e.g. dashboard) → always visible
 * - Route's parent feature key is in enabledFeatures
 * - Route's specific permission key is in enabledFeatures
 * - Any child of the route's parent group is in enabledFeatures
 *
 * Uses the same prefix matching as hasPermission: parent key grants all children.
 */
export function isFeatureEnabled(
  pathname: string,
  enabledFeatures: readonly PermissionKey[],
): boolean {
  const feature = getRouteFeature(pathname)
  if (!feature) return true

  // Check if the parent feature key or any matching permission is enabled
  // Use ROUTE_PERMISSION_MAP for granular check when available
  const routePermission = getRequiredPermission(pathname)
  if (routePermission) {
    return hasPermission(routePermission, enabledFeatures)
  }

  return enabledFeatures.includes(feature as PermissionKey)
}

// ---------------------------------------------------------------------------
// 7. DB boundary helper
// ---------------------------------------------------------------------------

/**
 * Filter raw TEXT permission keys from DB against the known set.
 * Discards any key that isn't in ALL_PERMISSION_KEYS (typos, removed keys).
 */
export function validatePermissionKeys(raw: string[]): PermissionKey[] {
  const valid = new Set<string>(ALL_PERMISSION_KEYS)
  return raw.filter((k) => valid.has(k)) as PermissionKey[]
}

/**
 * Filter raw JSONB enabled_features from DB against the known parent keys.
 * Discards any key that isn't a valid ParentKey (schema drift, typos).
 */
export function validateParentKeys(raw: unknown[]): ParentKey[] {
  const valid = new Set<string>(PARENT_KEYS)
  return raw.filter((k): k is ParentKey => typeof k === 'string' && valid.has(k))
}

// ---------------------------------------------------------------------------
// 8. Permission key expansion
// ---------------------------------------------------------------------------

/**
 * Expand permission keys: if a parent key is present, include all its children.
 * e.g., ['shop', 'content.blog'] -> ['shop', 'shop.products', 'shop.categories', 'shop.marketplace', 'content.blog']
 */
export function expandPermissionKeys(keys: PermissionKey[]): PermissionKey[] {
  const result = new Set<PermissionKey>(keys)
  for (const key of keys) {
    const group = Object.values(PERMISSION_GROUPS).find((g) => g.key === key)
    if (group && group.children.length > 0) {
      for (const child of group.children) {
        result.add(child as PermissionKey)
      }
    }
  }
  return Array.from(result)
}

export { PERMISSION_GROUPS }
