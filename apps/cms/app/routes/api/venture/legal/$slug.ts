import { createFileRoute } from '@tanstack/react-router'
import { getPublishedLegalPageBySlug } from '@/features/legal-pages/public.server'

// ---------------------------------------------------------------------------
// GET /api/venture/legal/:slug   (+ OPTIONS preflight)
//
// PUBLIC, unauthenticated read consumed by landings deployed outside this CMS
// (Przystań Inwestorów on the VPS: /api/venture/legal/przystan-inwestorow-regulamin).
// Mirrors api/venture/campaigns/$client/$slug — same CORS, same cache posture,
// same "null means 404, never 200-empty" contract.
//
// Client choice: ANON Supabase client (publishable key) — the `pages` RLS
// policy for anon is `is_published = true`, so an unpublished draft of a
// regulamin can never be served as if it were in force. NOT service-role.
//
// Slugs are NOT client-scoped here (unlike campaigns): `pages` is
// UNIQUE(tenant_id, slug) and a foreign landing knows no tenant id, so the
// slug itself carries the brand prefix.
//
// `$slug` is parsed from the URL pathname — server.handlers does not surface
// route params directly (mirrors api/venture/campaigns/$client/$slug).
// ---------------------------------------------------------------------------

const SLUG_PATH_REGEX = /^\/api\/venture\/legal\/([^/]+)\/?$/

// Legal text changes rarely, but an outdated regulamin is a legal problem, not
// a cosmetic one — so a shorter window than campaigns (5 min → 1 min) with a
// long stale-while-revalidate.
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=600'

function corsHeaders(): Record<string, string> {
  const origin = process.env.VENTURE_LANDING_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function jsonHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...corsHeaders(), 'Content-Type': 'application/json', ...extra }
}

const notFound = () =>
  new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: jsonHeaders(),
  })

export const Route = createFileRoute('/api/venture/legal/$slug')({
  component: () => null,
  server: {
    handlers: {
      // CORS preflight — browsers send OPTIONS before the cross-origin GET.
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const url = new URL(request.url)
        const match = url.pathname.match(SLUG_PATH_REGEX)
        const slug = match?.[1] ? decodeURIComponent(match[1]) : ''

        if (!slug) return notFound()

        const result = await getPublishedLegalPageBySlug(slug)

        return result.match(
          (page) => {
            // null = missing OR unpublished (RLS-hidden) → 404, never 200-empty.
            if (!page) return notFound()
            return new Response(JSON.stringify(page), {
              status: 200,
              headers: jsonHeaders({ 'Cache-Control': CACHE_CONTROL }),
            })
          },
          (error) => {
            console.error('[venture-legal] read failed:', error)
            return new Response(JSON.stringify({ error: 'internal_error' }), {
              status: 500,
              headers: jsonHeaders(),
            })
          },
        )
      },
    },
  },
})
