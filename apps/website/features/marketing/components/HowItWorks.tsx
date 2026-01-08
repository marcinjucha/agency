'use client'

import { StepCard } from './StepCard'
import type { Step, IconName } from '../types'

/**
 * Legal Hub "How It Works" Workflow - 6 steps
 * Based on Product-Idea.md: Phase 1 Client Intake Automation
 *
 * Flow:
 * 1. Lawyer creates intake form
 * 2. Generates shareable link
 * 3. Client fills out form
 * 4. AI analyzes & qualifies case
 * 5. Client books appointment in calendar
 * 6. Lawyer follows up with qualified lead
 */
const WORKFLOW_STEPS: Array<Step & { icon: IconName }> = [
  {
    id: 'step-1',
    number: 1,
    title: 'Lawyer tworzy formularz',
    description:
      'Kancelaria tworzy dostosowany formularz pobytu klienta bez kodowania. 7 typów pól, logika warunkowa, wieloetapowe formularze.',
    icon: 'document',
  },
  {
    id: 'step-2',
    number: 2,
    title: 'Generuje unikalny link',
    description:
      'System generuje unikalny link do formularza (np. legalhub.pl/survey/abc123), gotowy do wysłania klientom e-mailem.',
    icon: 'target',
  },
  {
    id: 'step-3',
    number: 3,
    title: 'Klient wypełnia formularz',
    description:
      'Klient otrzymuje link, wypełnia formularz w swoim domu (bez logowania). Walidacja w czasie rzeczywistym, automatyczne zapisywanie nasady.',
    icon: 'users',
  },
  {
    id: 'step-4',
    number: 4,
    title: 'AI kwalifikuje sprawę',
    description:
      'Webhook wyzwala analizę AI: klasyfikacja sprawy, ocena pilności (1-10), szacunek wartości, flagi ryzyka, rekomendacje.',
    icon: 'zap',
  },
  {
    id: 'step-5',
    number: 5,
    title: 'Klient rezerwuje wizytę',
    description:
      'Klient widzi dostępne godziny w kalendarzu, wybiera slot, który mu odpowiada. Automatyczne potwierdzenie przez system.',
    icon: 'clock',
  },
  {
    id: 'step-6',
    number: 6,
    title: 'Prawnik śledzi lead',
    description:
      'Wszystkie odpowiedzi, analiza AI i termin spotkania są dostępne w panelu CMS. Prawnik ma pełny kontekst przed spotkaniem.',
    icon: 'messages',
  },
]

/**
 * HowItWorks Component
 *
 * Section component rendering the complete 6-step Legal Hub workflow.
 * Features:
 * - Vertical flow on mobile, horizontal on desktop
 * - Visual connecting arrows/lines between steps
 * - Numbered step cards with icons
 * - Fully responsive design
 * - Accessibility-friendly (semantic HTML, proper headings)
 * - SVG connecting lines with responsive sizing
 *
 * Layout:
 * - Mobile (< 768px): Vertical stack with connecting lines
 * - Tablet (768px - 1024px): 2 columns with connecting lines
 * - Desktop (> 1024px): Horizontal 6-column layout with connecting arrows
 *
 * @example
 * ```tsx
 * <HowItWorks />
 * ```
 */
export function HowItWorks() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-secondary/5">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Jak to działa
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Od pierwszego kontaktu do umówionego spotkania w zaledwie 15 minut.
            Siedem-etapowy proces automatyzacji klientów dla kancelarii prawnych.
          </p>
        </div>

        {/* Desktop: Horizontal Layout with Connecting Arrows (lg: only) */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Step Cards Grid */}
            <div className="grid grid-cols-6 gap-4 mb-12">
              {WORKFLOW_STEPS.map((step) => (
                <StepCard
                  key={step.id}
                  step={step}
                  stepNumber={step.number}
                  icon={step.icon}
                />
              ))}
            </div>

            {/* Connecting Arrows (Desktop SVG) */}
            <svg
              className="absolute top-20 left-0 right-0 h-12 w-full"
              style={{ pointerEvents: 'none' }}
              aria-hidden="true"
            >
              {/* Arrow 1→2 */}
              <line x1="16.67%" y1="50" x2="33.33%" y2="50" stroke="currentColor" strokeWidth="2" />
              <polygon
                points="33.33,50 30,45 30,55"
                fill="currentColor"
              />

              {/* Arrow 2→3 */}
              <line x1="50%" y1="50" x2="66.67%" y2="50" stroke="currentColor" strokeWidth="2" />
              <polygon
                points="66.67,50 63.33,45 63.33,55"
                fill="currentColor"
              />

              {/* Arrow 3→4 */}
              <line x1="83.33%" y1="50" x2="100%" y2="50" stroke="currentColor" strokeWidth="2" />
              <polygon
                points="100,50 96.67,45 96.67,55"
                fill="currentColor"
              />

              {/* Lower row arrows - offset vertically for 3x2 layout simulation */}
              {/* Arrow 4→5 (wraps down and right) */}
              <path
                d="M 83.33 50 L 83.33 80 L 100 80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polygon points="100,80 96.67,75 96.67,85" fill="currentColor" />

              {/* Arrow 5→6 */}
              <line x1="83.33%" y1="80" x2="66.67%" y2="80" stroke="currentColor" strokeWidth="2" />
              <polygon points="66.67,80 70,75 70,85" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Tablet: 2-Column Grid (md: to lg:) */}
        <div className="hidden md:block lg:hidden">
          <div className="grid grid-cols-2 gap-6 mb-8">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step.id} className="relative">
                <StepCard
                  step={step}
                  stepNumber={step.number}
                  icon={step.icon}
                />

                {/* Vertical connecting line (except last column) */}
                {index < WORKFLOW_STEPS.length - 2 && (
                  <div className="absolute left-1/2 -bottom-6 h-6 w-0.5 bg-primary/40 transform -translate-x-1/2" />
                )}

                {/* Horizontal connecting line between rows */}
                {index === 0 && (
                  <div className="absolute -right-3 top-1/2 w-6 h-0.5 bg-primary/40 transform -translate-y-1/2" />
                )}
                {index === 1 && (
                  <div className="absolute -left-3 top-1/2 w-6 h-0.5 bg-primary/40 transform -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: Vertical Stack with Connecting Lines (max-md:) */}
        <div className="md:hidden space-y-6">
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connecting line (except first) */}
              {index > 0 && (
                <div className="absolute -top-6 left-4 h-6 w-0.5 bg-primary/40" />
              )}

              <StepCard
                step={step}
                stepNumber={step.number}
                icon={step.icon}
              />
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">
            Gotów na zmianę sposobu prowadzenia pobytu klienta?
          </p>
          <a
            href="#contact"
            className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors duration-200"
          >
            Rozpocznij bezpłatny test
          </a>
        </div>
      </div>
    </section>
  )
}
