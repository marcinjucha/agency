import { Metadata } from 'next'
import { Navbar } from '@/features/marketing/components/Navbar'
import { Hero } from '@/features/marketing/components/Hero'
import { Identification } from '@/features/marketing/components/Identification'
import { Problems } from '@/features/marketing/components/Problems'
import { Process } from '@/features/marketing/components/Process'
import { Results } from '@/features/marketing/components/Results'
import { FinalCTA } from '@/features/marketing/components/FinalCTA'
import { Footer } from '@/features/marketing/components/Footer'
import { getPublicLandingPage } from '@/features/marketing/queries'
import {
  DEFAULT_BLOCKS,
  type LandingBlock,
  type NavbarBlock,
  type HeroBlock,
  type IdentificationBlock,
  type ProblemsBlock,
  type ProcessBlock,
  type ResultsBlock,
  type CtaBlock,
  type FooterBlock,
} from '@agency/database'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Halo Efekt — Automatyzacja procesów biznesowych',
  description:
    'Automatyzujemy procesy operacyjne w firmach zatrudniających od kilku do 100 osób. Średnia oszczędność: 150 000 zł rocznie. Twoje ryzyko: 0%.',
  keywords: [
    'automatyzacja procesów',
    'automatyzacja biznesu',
    'AI dla firm',
    'optymalizacja procesów',
    'redukcja kosztów operacyjnych',
    'automatyzacja pracy',
  ],
  openGraph: {
    title: 'Halo Efekt — Automatyzacja procesów biznesowych',
    description:
      'Automatyzujemy procesy operacyjne w firmach i zwiększamy ich dochód bez zatrudniania nowych ludzi.',
    type: 'website',
    locale: 'pl_PL',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Halo Efekt',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Halo Efekt — Automatyzacja procesów biznesowych',
    description:
      'Automatyzujemy procesy operacyjne w firmach i zwiększamy ich dochód bez zatrudniania nowych ludzi.',
  },
}

function findBlock<T extends LandingBlock>(blocks: LandingBlock[], type: T['type']): T | undefined {
  return blocks.find((b) => b.type === type) as T | undefined
}

function hasNewBlockTypes(blocks: LandingBlock[]): boolean {
  const requiredTypes = ['identification', 'process', 'results']
  return requiredTypes.every((type) => blocks.some((b) => b.type === type))
}

export default async function HomePage() {
  const page = await getPublicLandingPage()
  const rawBlocks = page?.blocks?.length ? page.blocks : DEFAULT_BLOCKS
  const blocks = hasNewBlockTypes(rawBlocks) ? rawBlocks : DEFAULT_BLOCKS

  const navbar = findBlock<NavbarBlock>(blocks, 'navbar') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'navbar') as NavbarBlock)
  const hero = findBlock<HeroBlock>(blocks, 'hero') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'hero') as HeroBlock)
  const identification = findBlock<IdentificationBlock>(blocks, 'identification') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'identification') as IdentificationBlock)
  const problems = findBlock<ProblemsBlock>(blocks, 'problems') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'problems') as ProblemsBlock)
  const process = findBlock<ProcessBlock>(blocks, 'process') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'process') as ProcessBlock)
  const results = findBlock<ResultsBlock>(blocks, 'results') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'results') as ResultsBlock)
  const cta = findBlock<CtaBlock>(blocks, 'cta') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'cta') as CtaBlock)
  const footer = findBlock<FooterBlock>(blocks, 'footer') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'footer') as FooterBlock)

  return (
    <>
      <Navbar {...navbar} />
      <main className="w-full">
        <Hero {...hero} />
        <Identification {...identification} />
        <Problems {...problems} />
        <Process {...process} />
        <Results {...results} />
        <FinalCTA {...cta} />
      </main>
      <Footer {...footer} />
    </>
  )
}
