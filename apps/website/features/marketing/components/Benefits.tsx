/**
 * Benefits Section Component
 *
 * Renders the "Korzyści dla Twojej kancelarii" (Benefits for Your Law Firm) section
 * with a responsive grid of benefit cards.
 *
 * Features:
 * - Section heading with Polish text
 * - Responsive grid layout (1 col mobile → 2 col tablet → 3 col desktop)
 * - Maps BENEFITS data to BenefitCard components
 * - Fully responsive and accessible
 *
 * @module apps/website/features/marketing/components/Benefits
 */

import { BenefitCard } from './BenefitCard'
import { BENEFITS } from '../data/benefits'

/**
 * Benefits - Displays all benefits in a responsive grid section
 *
 * Grid Layout:
 * - Mobile (< 768px): 1 column (full width)
 * - Tablet (768px - 1024px): 2 columns
 * - Desktop (> 1024px): 3 columns
 *
 * Section structure:
 * 1. Container with max-width and centered padding
 * 2. Section heading
 * 3. Grid of BenefitCard components
 *
 * @returns Rendered benefits section component
 *
 * @example
 * ```tsx
 * import { Benefits } from '@/features/marketing/components/Benefits'
 *
 * export default function HomePage() {
 *   return (
 *     <>
 *       <Benefits />
 *     </>
 *   )
 * }
 * ```
 */
export function Benefits() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center">
            Korzyści dla Twojej kancelarii
          </h2>
          <p className="text-center text-muted-foreground mt-4 max-w-2xl mx-auto">
            Sześć mierzalnych korzyści, które zmieniają sposób pracy z klientami
          </p>
        </div>

        {/* Responsive Grid - 1 col (mobile) → 2 col (tablet) → 3 col (desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((benefit) => (
            <BenefitCard key={benefit.id} benefit={benefit} />
          ))}
        </div>
      </div>
    </section>
  )
}
