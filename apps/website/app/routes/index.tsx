import { createFileRoute } from '@tanstack/react-router'
import { CACHE_STATIC } from '@/lib/cache-headers'
import {
  DEFAULT_BLOCKS,
  type SeoMetadata,
  type HeroBlock,
  type IdentificationBlock,
  type ProblemsBlock,
  type ProcessBlock,
  type ResultsBlock,
  type CtaBlock,
} from '@agency/database'
import { getPublicLandingPageFn } from '@/features/marketing/server'
import { getSiteSettingsFn } from '@/features/site-settings/server'
import { findBlock, hasNewBlockTypes } from '@/features/marketing/utils'
import { buildWebsiteHead } from '@/lib/head'
import { Hero } from '@/features/marketing/components/Hero'
import { Identification } from '@/features/marketing/components/Identification'
import { Problems } from '@/features/marketing/components/Problems'
import { Process } from '@/features/marketing/components/Process'
import { Results } from '@/features/marketing/components/Results'
import { FinalCTA } from '@/features/marketing/components/FinalCTA'

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
  loader: async () => {
    const [page, siteSettings] = await Promise.all([
      getPublicLandingPageFn(),
      getSiteSettingsFn(),
    ])
    return { page, siteSettings }
  },
  head: ({ loaderData }) => {
    const seo = (loaderData?.page?.seo_metadata ?? {}) as SeoMetadata
    const title = seo.title || FALLBACK_TITLE
    const description = seo.description || FALLBACK_DESCRIPTION
    const ogImage = seo.ogImage || FALLBACK_OG_IMAGE
    const base = buildWebsiteHead(title, description, ogImage)

    return {
      ...base,
      meta: [
        ...base.meta,
        { property: 'og:locale', content: 'pl_PL' },
        { property: 'og:type', content: 'website' },
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
  const { page } = Route.useLoaderData()

  const rawBlocks = page?.blocks?.length ? page.blocks : DEFAULT_BLOCKS
  const blocks = hasNewBlockTypes(rawBlocks) ? rawBlocks : DEFAULT_BLOCKS

  const hero = findBlock<HeroBlock>(blocks, 'hero') ??
    (DEFAULT_BLOCKS.find((b) => b.type === 'hero') as HeroBlock)
  const identification = findBlock<IdentificationBlock>(blocks, 'identification') ??
    (DEFAULT_BLOCKS.find((b) => b.type === 'identification') as IdentificationBlock)
  const problems = findBlock<ProblemsBlock>(blocks, 'problems') ??
    (DEFAULT_BLOCKS.find((b) => b.type === 'problems') as ProblemsBlock)
  const process = findBlock<ProcessBlock>(blocks, 'process') ??
    (DEFAULT_BLOCKS.find((b) => b.type === 'process') as ProcessBlock)
  const results = findBlock<ResultsBlock>(blocks, 'results') ??
    (DEFAULT_BLOCKS.find((b) => b.type === 'results') as ResultsBlock)
  const cta = findBlock<CtaBlock>(blocks, 'cta') ??
    (DEFAULT_BLOCKS.find((b) => b.type === 'cta') as CtaBlock)

  return (
    <main className="w-full">
      <Hero {...hero} />
      <Identification {...identification} />
      <Problems {...problems} />
      <Process {...process} />
      <Results {...results} />
      <FinalCTA {...cta} />
    </main>
  )
}
