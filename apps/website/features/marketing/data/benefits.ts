/**
 * Benefits Data for Halo Efekt Landing Page
 *
 * Six quantifiable benefits that showcase the value proposition of Halo Efekt.
 * Each benefit includes a metric, headline, explanation, and supporting text.
 *
 * Data sourced from Product-Idea.md § 6. Marketing Angle / Positioning
 *
 * @module apps/website/features/marketing/data/benefits
 */

import type { Benefit } from '../types'

/**
 * Benefits array for the Halo Efekt landing page
 *
 * Each benefit represents a key value proposition for law firms:
 * 1. Speed - 3x faster client intake (5 days → 15 minutes)
 * 2. Conversion - No more lost leads due to slow response
 * 3. Qualification - AI pre-screens cases, eliminating time-wasters
 * 4. Automation - Zero manual booking overhead
 * 5. Intelligence - Data-driven decision making for case selection
 * 6. Brand - Professional, tech-forward first impression
 */
export const BENEFITS: Benefit[] = [
  {
    id: 'benefit-1',
    icon: 'zap',
    metric: '5 dni → 15 minut',
    headline: '3x szybszy client intake',
    explanation:
      'Lead wypełnia form → AI kwalifikuje → umawia się automatycznie. Zero delay, zero tracking.',
    subtext: 'Jeśli 20 leadów/m × 2h saved per lead = 40h/m saved × 200 PLN/h = 8,000 PLN value',
  },
  {
    id: 'benefit-2',
    icon: 'check',
    metric: '40-50% więcej konsultacji',
    headline: 'Nie przegapisz już żadnego high-value leadu',
    explanation:
      'Instant response + automatic booking = 0% lead leakage. Wszystkie wysokojakościowe leady trafiają do Ciebie',
    subtext: 'Średni klient = 5-10K PLN revenue. +5 klientów/m = +50K PLN revenue',
  },
  {
    id: 'benefit-3',
    icon: 'shield',
    metric: '30% mniej zmarnowanych konsultacji',
    headline: 'Automatyczna kwalifikacja spraw (30 min konsultacji → 5 min review)',
    explanation:
      'Pre-screen cases przed spotkaniem: case type, urgency, value, risk flags. Ty decydujesz czy umówić',
    subtext: 'Time-wasters eliminated = 10h saved × 400 PLN/h = 4,000 PLN monthly value',
  },
  {
    id: 'benefit-4',
    icon: 'target',
    metric: '40h/miesiąc oszczędzone',
    headline: 'Zero manual booking chaos',
    explanation:
      'Client samodzielnie wybiera slot z kalendarza. Zero email exchanges, zero "sprawdzę i oddzwonię"',
    subtext: 'Zamiast asystentki 40h × 80 PLN/h = 3,200 PLN/m saved',
  },
  {
    id: 'benefit-5',
    icon: 'briefcase',
    metric: 'Complete visibility',
    headline: 'Data-driven decisions (nie "na czuja")',
    explanation:
      'Dashboard pokazuje: lead sources, conversion rates, case type breakdown, revenue per case. Skaluj biznes z danych',
    subtext: 'Better case selection = higher profitability + peace of mind',
  },
  {
    id: 'benefit-6',
    icon: 'star',
    metric: 'Competitive advantage',
    headline: 'Professional first impression',
    explanation:
      'Client dzwoni → dostaje instant smart form → auto-booking. Feels like tech-forward firm, not small local shop',
    subtext: 'AI integration = instant credibility i trust',
  },
]
