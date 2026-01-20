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
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardContent className="flex flex-col h-full pt-6">
        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-xl text-primary">
              ★
            </span>
          ))}
        </div>

        {/* Quote */}
        <blockquote className="flex-grow mb-6">
          <p className="text-muted-foreground italic leading-relaxed">
            "{testimonial.quote}"
          </p>
        </blockquote>

        {/* Author Info */}
        <div className="border-t border-border pt-4">
          <p className="font-semibold text-foreground">{testimonial.author}</p>

          {testimonial.company && (
            <p className="text-sm text-muted-foreground">{testimonial.company}</p>
          )}

          <p className="text-sm text-muted-foreground">{testimonial.city}</p>

          {testimonial.metrics && (
            <p className="text-sm text-primary font-medium mt-2">
              {testimonial.metrics}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
