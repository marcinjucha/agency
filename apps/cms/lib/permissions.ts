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
    children: ['workflows.executions'] as const,
  },
  system: {
    key: 'system',
    children: [
      'system.email_templates',
      'system.settings',
      'system.users',
      'system.roles',
    ] as const,
  },
} as const

// ---------------------------------------------------------------------------
// 2. Derived types — compiler-enforced, not hand-maintained
// ---------------------------------------------------------------------------

type PermissionGroupMap = typeof PERMISSION_GROUPS
type ParentKey = PermissionGroupMap[keyof PermissionGroupMap]['key']
type ChildKey = PermissionGroupMap[keyof PermissionGroupMap]['children'][number]

/** Union of all valid permission keys. TypeScript errors on invalid strings. */
export type PermissionKey = ParentKey | ChildKey

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
// 6. DB boundary helper
// ---------------------------------------------------------------------------

/**
 * Filter raw TEXT permission keys from DB against the known set.
 * Discards any key that isn't in ALL_PERMISSION_KEYS (typos, removed keys).
 */
export function validatePermissionKeys(raw: string[]): PermissionKey[] {
  const valid = new Set<string>(ALL_PERMISSION_KEYS)
  return raw.filter((k) => valid.has(k)) as PermissionKey[]
}

export { PERMISSION_GROUPS }
