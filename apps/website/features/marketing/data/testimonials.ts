/**
 * Testimonials Data
 *
 * Customer testimonials for the Legal Hub landing page.
 * These are placeholder testimonials that will be populated with real customer data
 * during the beta testing phase.
 *
 * @module apps/website/features/marketing/data/testimonials
 */

import type { Testimonial } from '../types'

/**
 * Array of customer testimonials
 * Currently contains placeholder quotes that will be replaced with real customer feedback
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    quote:
      '[Placeholder: Real quote about 3x faster intake / lead capture improvement will go here]',
    author: 'Marek Lewandowski',
    company: 'Kancelaria Lewandowski & Wspólnicy',
    city: 'Warszawa',
    practiceArea: 'prawo-handlowe',
    metrics: 'Przed: 20 leads/m → Po: 35 leads/m (+75%)',
  },
  {
    id: 'testimonial-2',
    quote:
      '[Placeholder: Real quote about time savings / booking automation will go here]',
    author: 'Anna Szymańska',
    company: 'Kancelaria Prawna Szymańska',
    city: 'Kraków',
    practiceArea: 'prawo-rodzinne',
    metrics: 'Przed: 40h/m na rezerwacje → Po: 10h/m (-75%)',
  },
  {
    id: 'testimonial-3',
    quote:
      '[Placeholder: Real quote about professional impression / client experience will go here]',
    author: 'Paweł Nowak',
    company: 'Kancelaria Nowak i Partnerzy',
    city: 'Wrocław',
    practiceArea: 'prawo-pracy',
    metrics: 'Konwersja lead-to-consultation: +40%',
  },
]
