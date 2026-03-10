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

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="w-full">
        <Hero />
        <Problems />
        <Guarantee />
        <RiskReversal />
        <Benefits />
        <Qualification />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
