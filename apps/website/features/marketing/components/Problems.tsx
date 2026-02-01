/**
 * Problems Section Component
 *
 * Displays all problems/pain points that Legal Hub solves.
 * Renders problems in a responsive grid layout:
 * - 1 column on mobile
 * - 2 columns on tablet
 * - 3 columns on desktop
 *
 * @module apps/website/features/marketing/components/Problems
 */

import { PROBLEMS } from '../data/problems'
import { ProblemCard } from './ProblemCard'

export function Problems() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
      {/* Container */}
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-4xl font-bold text-foreground mb-4">
            Problemy, które rozwiązujemy
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Te wyzwania dotykają każdą małą kancelarię. Tradycyjne procesy kosztują Cię czas, pieniądze i klientów.
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROBLEMS.map((problem, index) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              number={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
