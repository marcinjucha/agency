/**
 * BenefitCard Component
 *
 * Reusable card component for displaying individual benefits on the marketing page.
 * Prominently highlights the metric with large, bold typography.
 *
 * Features:
 * - Icon + metric + headline + explanation + subtext layout
 * - Responsive design with Tailwind CSS
 * - Metric prominently styled (larger font, accent color)
 * - Accessibility-friendly semantic HTML
 *
 * @module apps/website/features/marketing/components/BenefitCard
 */

import { Card } from '@legal-mind/ui'
import { getIcon } from '../lib/getIcon'
import type { Benefit, IconName } from '../types'

/**
 * Props for BenefitCard component
 */
interface BenefitCardProps {
  /** Benefit data containing metric, headline, explanation, etc. */
  benefit: Benefit

  /** Icon name from IconName type (can be overridden in props) */
  icon?: IconName
}

/**
 * BenefitCard - Displays a single benefit in a card layout
 *
 * Layout (top to bottom):
 * 1. Icon (32px, accent color)
 * 2. Metric (large, bold, accent color) - prominently featured
 * 3. Headline (font-semibold, gray-900)
 * 4. Explanation (gray-600, smaller)
 * 5. Subtext (gray-500, smallest)
 *
 * @param benefit - Benefit data from BENEFITS array
 * @param icon - Optional icon name to override benefit.icon
 * @returns Rendered benefit card component
 *
 * @example
 * import { BENEFITS } from '@/features/marketing/data/benefits'
 * import { BenefitCard } from './BenefitCard'
 *
 * export function Benefits() {
 *   return (
 *     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 *       {BENEFITS.map((benefit) => (
 *         <BenefitCard key={benefit.id} benefit={benefit} />
 *       ))}
 *     </div>
 *   )
 * }
 */
export function BenefitCard({ benefit, icon }: BenefitCardProps) {
  const iconName = icon || benefit.icon
  const Icon = getIcon(iconName)

  return (
    <Card className="p-6 h-full flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200">
      {/* Icon */}
      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/5">
        <Icon size={24} className="text-primary" aria-hidden="true" />
      </div>

      {/* Metric - Prominently Displayed */}
      <div className="flex flex-col gap-1">
        <p
          className="text-2xl font-bold text-primary"
          role="doc-subtitle"
          aria-label={`Benefit metric: ${benefit.metric}`}
        >
          {benefit.metric}
        </p>
      </div>

      {/* Headline */}
      <h3 className="text-lg font-semibold text-foreground leading-snug">
        {benefit.headline}
      </h3>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground flex-grow">{benefit.explanation}</p>

      {/* Subtext */}
      <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
        {benefit.subtext}
      </p>
    </Card>
  )
}
