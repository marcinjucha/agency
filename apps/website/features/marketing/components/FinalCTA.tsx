'use client'

import { Button } from '@legal-mind/ui'
import Link from 'next/link'

/**
 * FinalCTA - Final Call-to-Action Section
 *
 * A compelling conversion-focused section appearing before the footer.
 * Features:
 * - Polish headline: "Zamieniaj więcej klientów. Pracuj mniej."
 * - Subheading emphasizing efficiency benefits
 * - Two CTAs: Primary demo booking, Secondary learn more
 * - Gradient blue background for visual impact
 * - Full responsive support (mobile → tablet → desktop)
 * - High contrast colors for WCAG AA compliance
 * - Subtle accessibility focus states
 *
 * @returns Rendered final CTA section component
 *
 * @example
 * ```tsx
 * import { FinalCTA } from '@/features/marketing/components/FinalCTA'
 *
 * export default function HomePage() {
 *   return (
 *     <>
 *       <Features />
 *       <Pricing />
 *       <FinalCTA />
 *       <Footer />
 *     </>
 *   )
 * }
 * ```
 */
export function FinalCTA() {
  return (
    <section
      className="py-16 md:py-24 lg:py-32 px-4 bg-gradient-to-br from-blue-600 to-blue-700 relative overflow-hidden"
      aria-label="Final call to action section"
    >
      {/* Decorative background element */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          Zamieniaj więcej klientów.
          <br className="hidden sm:inline" />
          Pracuj mniej.
        </h2>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Automatyzuj intake formularze i kwalifikacje, aby skoncentrować się na tym, co naprawdę ważne: wygrywaniu spraw i budowaniu relacji z klientami.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center sm:items-stretch">
          {/* Primary Button - Book Demo */}
          <Link href="#demo" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              aria-label="Zarezerwuj demo Legal Hub - otwiera formularz rezerwacji"
            >
              Zarezerwuj demo
            </Button>
          </Link>

          {/* Secondary Button - Learn More */}
          <Link href="/o-nas" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full border-2 border-white text-white hover:bg-blue-500 font-semibold transition-all duration-200"
              aria-label="Dowiedz się więcej o Legal Hub - przechodzi do strony o nas"
            >
              Dowiedz się więcej
            </Button>
          </Link>
        </div>

        {/* Trust Badge */}
        <p className="text-blue-100 text-sm md:text-base mt-12 font-medium">
          Dołącz do kancelarii, które już automatyzują swoje procesy
        </p>
      </div>
    </section>
  )
}
