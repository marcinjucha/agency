import { createFileRoute } from '@tanstack/react-router'
import { getPublishedCampaignBySlug } from '@/features/venture/server'

// ---------------------------------------------------------------------------
// GET /api/venture/campaigns/:client/:slug   (+ OPTIONS preflight)
//
// PUBLIC, unauthenticated read consumed by the venture landing front on the VPS
// (a different origin than this CMS on Vercel). Returns the campaign brand +
// published bonuses (spec §7). server.handlers.GET strips the handler from the
// client bundle and lets us return a direct HTTP Response.
//
// Client-scoped slugs: campaign slugs are unique per client (so_campaigns
// UNIQUE(client_id, slug)), not globally — the URL now carries BOTH the
// client slug and the campaign slug.
//
// Client choice: ANON Supabase client (publishable key) — RLS + column GRANT
// enforce published-only rows and hide esp_* columns. NOT service-role.
//
// CORS: the landing is cross-origin, so the browser fetch requires
// Access-Control-Allow-Origin. Data is public + non-credentialed (brand + links),
// so echoing VENTURE_LANDING_ORIGIN (fallback '*') is acceptable.
//
// `$client`/`$slug` route params are parsed from the URL pathname —
// server.handlers does not surface route params directly (mirrors
// api/marketplace/$marketplace/callback).
// ---------------------------------------------------------------------------

const SLUG_PATH_REGEX = /^\/api\/venture\/campaigns\/([^/]+)\/([^/]+)\/?$/

// Campaigns change rarely — let the edge cache the public payload.
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

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

export const Route = createFileRoute('/api/venture/campaigns/$client/$slug')({
  component: () => null,
  server: {
    handlers: {
      // CORS preflight — browsers send OPTIONS before the cross-origin GET.
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),

      GET: async ({ request }) => {
        const url = new URL(request.url)
        const match = url.pathname.match(SLUG_PATH_REGEX)
        const clientSlug = match?.[1] ? decodeURIComponent(match[1]) : ''
        const slug = match?.[2] ? decodeURIComponent(match[2]) : ''

        if (!clientSlug || !slug) return notFound()

        const result = await getPublishedCampaignBySlug(clientSlug, slug)

        return result.match(
          (campaign) => {
            // null = missing OR unpublished (RLS-hidden) → 404, never 200-empty.
            if (!campaign) return notFound()
            return new Response(JSON.stringify(campaign), {
              status: 200,
              headers: jsonHeaders({ 'Cache-Control': CACHE_CONTROL }),
            })
          },
          (error) => {
            console.error('[venture-campaign] read failed:', error)
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
