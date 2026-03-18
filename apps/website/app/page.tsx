import { Metadata } from 'next'
import { Navbar } from '@/features/marketing/components/Navbar'
import { Hero } from '@/features/marketing/components/Hero'
import { Problems } from '@/features/marketing/components/Problems'
import { Guarantee } from '@/features/marketing/components/Guarantee'
import { RiskReversal } from '@/features/marketing/components/RiskReversal'
import { Benefits } from '@/features/marketing/components/Benefits'
import { Qualification } from '@/features/marketing/components/Qualification'
import { FinalCTA } from '@/features/marketing/components/FinalCTA'
import { Footer } from '@/features/marketing/components/Footer'
import { getPublicLandingPage } from '@/features/marketing/queries'
import {
  DEFAULT_BLOCKS,
  type LandingBlock,
  type NavbarBlock,
  type HeroBlock,
  type ProblemsBlock,
  type GuaranteeBlock,
  type RiskReversalBlock,
  type BenefitsBlock,
  type QualificationBlock,
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

export default async function HomePage() {
  const page = await getPublicLandingPage()
  const blocks = page?.blocks?.length ? page.blocks : DEFAULT_BLOCKS

  const navbar = findBlock<NavbarBlock>(blocks, 'navbar') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'navbar') as NavbarBlock)
  const hero = findBlock<HeroBlock>(blocks, 'hero') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'hero') as HeroBlock)
  const problems = findBlock<ProblemsBlock>(blocks, 'problems') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'problems') as ProblemsBlock)
  const guarantee = findBlock<GuaranteeBlock>(blocks, 'guarantee') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'guarantee') as GuaranteeBlock)
  const riskReversal = findBlock<RiskReversalBlock>(blocks, 'riskReversal') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'riskReversal') as RiskReversalBlock)
  const benefits = findBlock<BenefitsBlock>(blocks, 'benefits') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'benefits') as BenefitsBlock)
  const qualification = findBlock<QualificationBlock>(blocks, 'qualification') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'qualification') as QualificationBlock)
  const cta = findBlock<CtaBlock>(blocks, 'cta') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'cta') as CtaBlock)
  const footer = findBlock<FooterBlock>(blocks, 'footer') ?? (DEFAULT_BLOCKS.find((b) => b.type === 'footer') as FooterBlock)

  return (
    <>
      <Navbar {...navbar} />
      <main className="w-full">
        <Hero {...hero} />
        <Problems {...problems} />
        <Guarantee {...guarantee} />
        <RiskReversal {...riskReversal} />
        <Benefits {...benefits} />
        <Qualification {...qualification} />
        <FinalCTA {...cta} />
      </main>
      <Footer {...footer} />
    </>
  )
}
