/**
 * Hero Section Component
 *
 * Main landing page hero section with compelling headline, subheading,
 * description, and CTA buttons. Features responsive layout with
 * text on left and hero image/graphic on right.
 *
 * Features:
 * - Large headline: "Zautomatyzuj przyjmowanie klientów"
 * - Subheading with problem statement
 * - Description paragraph with key benefits
 * - Two CTA buttons (primary + secondary)
 * - Hero image placeholder with gradient background
 * - Metrics row showcasing key statistics
 * - Responsive design (mobile stacked, desktop 2-column)
 * - Subtle animations on load
 *
 * @module apps/website/features/marketing/components/Hero
 */

'use client'

import Link from 'next/link'
import { Button } from '@agency/ui'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { HeroGraphic } from './HeroGraphic'

/**
 * Hero - Main landing page hero section with CTA and metrics
 *
 * Layout (desktop):
 * - Left (60%): Headline, subheading, description, buttons, metrics
 * - Right (40%): Hero graphic/illustration
 *
 * Responsive:
 * - Mobile: Single column, stacked content
 * - Tablet: 2 columns with adjusted spacing
 * - Desktop: Generous spacing, optimized typography
 *
 * @returns Rendered hero section component
 */
export function Hero() {
  const metrics = [
    { label: 'surveyów', value: '500+' },
    { label: 'odpowiedzi', value: '10k+' },
    { label: 'conversion rate', value: '95%' },
  ]

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden pt-32 pb-20 md:pb-32 lg:pb-40">
      {/* Background decoration elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full opacity-10 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full opacity-10 blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Text Content */}
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-700">
            {/* Headline */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Zautomatyzuj
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/90">
                  przyjmowanie klientów
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl sm:text-2xl text-muted-foreground font-semibold mb-4">
                Oszczędzaj czas, zyskuj więcej klientów
              </p>

              {/* Description */}
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Halo Efekt to inteligentna platforma automatyzacji pozyskiwania klientów dla polskich kancelarii prawnych.
                Smart surveys, AI kwalifikacja spraw, i automatyczne umawianie spotkań w jednym miejscu.
                Skróć proces intake z 5 dni na 15 minut i nie przegap już żadnego high-value leadu.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/demo">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow w-full sm:w-auto"
                >
                  Zarezerwuj demo
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>

              <Link href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary text-primary hover:bg-primary/5 w-full sm:w-auto"
                >
                  Dowiedz się więcej
                </Button>
              </Link>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
              {metrics.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-1">
                  <p className="text-2xl sm:text-3xl font-bold text-primary">
                    {metric.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Bezpieczna autoryzacja Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Szyfrowanie end-to-end dla danych klientów</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Bez zobowiązań, zrezygnuj w każdej chwili</span>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Graphic */}
          <div className="hidden lg:flex items-center justify-center animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
            <HeroGraphic />
          </div>
        </div>
      </div>
    </section>
  )
}
