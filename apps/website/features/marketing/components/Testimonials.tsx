'use client'

import { TESTIMONIALS } from '../data/testimonials'
import { TestimonialCard } from './TestimonialCard'

/**
 * Testimonials Section
 *
 * Displays customer testimonials in a responsive grid/carousel layout.
 * Features:
 * - Grid layout: 3 columns on desktop, 1 on mobile
 * - Section heading: "Co mówią nasi klienci"
 * - Testimonial cards with quotes, ratings, and metrics
 * - Auto-responsive via Tailwind CSS grid
 *
 * @component
 * @example
 * <Testimonials />
 */
export function Testimonials() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Co mówią nasi klienci
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Poznaj doświadczenia prawników, którzy już korzystają z naszej platformy
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
