/**
 * ProblemCard Component
 *
 * Reusable card component for displaying individual problems in the Problems section.
 * Each card displays an icon, number badge, headline, and description.
 *
 * @module apps/website/features/marketing/components/ProblemCard
 */

import { Card } from '@legal-mind/ui'
import type { Problem } from '../types'
import { getIcon } from '../lib/getIcon'

interface ProblemCardProps {
  /** Problem data with headline and description */
  problem: Problem
  /** Position number (1-6) for the badge */
  number: number
}

export function ProblemCard({ problem, number }: ProblemCardProps) {
  const IconComponent = getIcon(problem.icon)

  return (
    <Card className="h-full p-6 hover:shadow-lg transition-shadow duration-200 flex flex-col">
      {/* Icon and Number Badge */}
      <div className="flex items-start gap-4 mb-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Number Badge */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
            {number}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        {/* Headline */}
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-3">
          {problem.headline}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {problem.description}
        </p>
      </div>
    </Card>
  )
}
