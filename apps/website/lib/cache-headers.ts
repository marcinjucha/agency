/**
 * Shared Cache-Control header presets for TanStack Start routes.
 *
 * Maps to Next.js ISR revalidate values:
 *   revalidate=60  → blog (frequently updated)
 *   revalidate=3600 → landing, legal, sitemap (rarely updated)
 *   no cache        → survey, preview (dynamic per-request)
 */

/** Blog pages — s-maxage=60, short client cache */
export const CACHE_BLOG = {
  'Cache-Control': 'public, max-age=10, s-maxage=60, stale-while-revalidate=3600',
} as const

/** Static pages (landing, legal, sitemap) — s-maxage=3600 (1h) */
export const CACHE_STATIC = {
  'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
} as const
