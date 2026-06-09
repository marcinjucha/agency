import { createFileRoute } from '@tanstack/react-router'
import { CACHE_STATIC } from '@/lib/cache-headers'
import { queryKeys } from '@/lib/query-keys'
import { fetchRootData } from './__root'
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
  // Read the same { ctaUrl, siteSettings } the __root loader already fetched.
  // The root ran `ensureQueryData(queryKeys.landing.all, fetchRootData)` before
  // this child loader; re-using the SAME key + queryFn here is a cache hit, so
  // getLandingCtaUrlFn + getSiteSettingsFn do NOT execute a second time per nav.
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.landing.all,
      queryFn: fetchRootData,
      staleTime: 1000 * 60 * 60, // 1h — must match __root.tsx so the entry is shared
    }),
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
