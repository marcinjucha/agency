import { createFileRoute } from '@tanstack/react-router'
import { CACHE_STATIC } from '@/lib/cache-headers'
import { buildWebsiteHead } from '@/lib/head'
import { Landing } from '@/features/marketing/components/Landing'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_TITLE = 'Halo Efekt — Automatyzacja procesów biznesowych'
const FALLBACK_DESCRIPTION =
  'Automatyzujemy procesy operacyjne w firmach zatrudniających od kilku do 100 osób. Średnia oszczędność: 150 000 zł rocznie. Twoje ryzyko: 0%.'
const FALLBACK_OG_IMAGE = '/og-image.png'

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/')({
  // Read the same { ctaUrl, siteSettings } the __root route already fetched in
  // its `beforeLoad` (exposed via router context). The server fns run ONCE per
  // request in __root; this loader just forwards that data — no second invocation.
  loader: ({ context }) => context.rootData,
  head: ({ loaderData }) => {
    const title = FALLBACK_TITLE
    const description = FALLBACK_DESCRIPTION
    const ogImage = FALLBACK_OG_IMAGE

    // Merge site default keywords with deduplication (old Next.js behavior)
    const mergedKeywords = [
      ...new Set((loaderData?.siteSettings?.default_keywords ?? []).map((k) => k.toLowerCase())),
    ]
    const keywords = mergedKeywords.length ? mergedKeywords : undefined

    const base = buildWebsiteHead(title, description, ogImage, keywords, '')

    return {
      ...base,
      meta: [
        ...base.meta,
        { property: 'og:locale', content: 'pl_PL' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: title },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    }
  },
  headers: () => CACHE_STATIC,
  component: HomePage,
})

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function HomePage() {
  const { ctaUrl } = Route.useLoaderData()
  return <Landing ctaUrl={ctaUrl} />
}
