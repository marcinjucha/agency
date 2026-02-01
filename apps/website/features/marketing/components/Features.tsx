/**
 * Features Section Component
 *
 * Displays all platform features in a responsive grid layout.
 * Features are mapped to FeatureCard components and organized by grid columns.
 *
 * Responsive layout:
 * - Mobile (< 768px): 1 column
 * - Tablet (768px - 1024px): 2 columns
 * - Desktop (> 1024px): 3 columns
 *
 * @module apps/website/features/marketing/components/Features
 */

import { FEATURES } from '../data/features'
import { FeatureCard } from './FeatureCard'

export function Features() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Nasz stos technologiczny
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Wszystkie narzędzia potrzebne do automatyzacji procesu przyjmowania klientów
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
