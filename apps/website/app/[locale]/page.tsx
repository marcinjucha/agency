import { Metadata } from 'next'
import { Navbar } from '@/features/marketing/components/Navbar'
import { Hero } from '@/features/marketing/components/Hero'
import { Problems } from '@/features/marketing/components/Problems'
import { Benefits } from '@/features/marketing/components/Benefits'
import { Features } from '@/features/marketing/components/Features'
import { HowItWorks } from '@/features/marketing/components/HowItWorks'
import { Pricing } from '@/features/marketing/components/Pricing'
import { Testimonials } from '@/features/marketing/components/Testimonials'
import { FAQ } from '@/features/marketing/components/FAQ'
import { FinalCTA } from '@/features/marketing/components/FinalCTA'
import { Footer } from '@/features/marketing/components/Footer'

export const metadata: Metadata = {
  title: 'Halo Efekt - Zautomatyzuj przyjmowanie klientów',
  description:
    'Oszczędzaj czas, zwiększ konwersję klientów. Automatyczna kwalifikacja, integracja z kalendarzem, zarządzanie odpowiedziami.',
  keywords: [
    'automatyzacja kancelarii',
    'intake klientów',
    'AI kwalifikacja spraw',
    'calendar booking',
    'surveys dla prawników'
  ],
  openGraph: {
    title: 'Halo Efekt - Zautomatyzuj przyjmowanie klientów',
    description:
      'Oszczędzaj czas, zwiększ konwersję klientów. Automatyczna kwalifikacja, integracja z kalendarzem, zarządzanie odpowiedziami.',
    type: 'website',
    locale: 'pl_PL',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Halo Efekt'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Halo Efekt - Zautomatyzuj przyjmowanie klientów',
    description:
      'Oszczędzaj czas, zwiększ konwersję klientów. Automatyczna kwalifikacja, integracja z kalendarzem, zarządzanie odpowiedziami.'
  }
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="w-full">
        <Hero />
        <Problems />
        <Benefits />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
