'use client'

import { Card, CardContent } from '@legal-mind/ui'
import type { Testimonial } from '../types'

type TestimonialCardProps = {
  testimonial: Testimonial
}

/**
 * TestimonialCard
 *
 * Reusable card component for displaying customer testimonials.
 * Features:
 * - Quote text with emphasis styling
 * - Author name and company
 * - Location and practice area
 * - Metrics/results achieved
 * - 5-star rating display
 *
 * @component
 * @example
 * <TestimonialCard testimonial={testimonial} />
 */
export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex flex-col h-full pt-6">
        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-xl">
              ★
            </span>
          ))}
        </div>

        {/* Quote */}
        <blockquote className="flex-grow mb-6">
          <p className="text-gray-700 italic leading-relaxed">
            "{testimonial.quote}"
          </p>
        </blockquote>

        {/* Author Info */}
        <div className="border-t pt-4">
          <p className="font-semibold text-gray-900">{testimonial.author}</p>

          {testimonial.company && (
            <p className="text-sm text-gray-600">{testimonial.company}</p>
          )}

          <p className="text-sm text-gray-500">{testimonial.city}</p>

          {testimonial.metrics && (
            <p className="text-sm text-blue-600 font-medium mt-2">
              {testimonial.metrics}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
