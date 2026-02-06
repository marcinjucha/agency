/**
 * FeatureCard Component
 *
 * Reusable card component for displaying individual features in the Features section.
 * Each card displays an icon, headline, description, and optional "Coming Soon" badge.
 *
 * @module apps/website/features/marketing/components/FeatureCard
 */

import { Card, Badge } from '@agency/ui'
import type { Feature } from '../types'
import { getIcon } from '../lib/getIcon'

interface FeatureCardProps {
  /** Feature data with headline, description, and icon */
  feature: Feature
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const IconComponent = getIcon(feature.icon)

  return (
    <Card
      className="h-full p-6 flex flex-col hover:shadow-lg transition-shadow duration-200"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mb-4">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-lg ${
            feature.isComingSoon
              ? 'bg-muted'
              : 'bg-primary/10'
          }`}
        >
          <IconComponent
            className={`w-6 h-6 ${
              feature.isComingSoon
                ? 'text-muted-foreground'
                : 'text-primary'
            }`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        {/* Headline with Coming Soon Badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">
            {feature.name}
          </h3>
          {feature.isComingSoon && (
            <Badge
              variant="secondary"
              className="flex-shrink-0 text-xs whitespace-nowrap"
            >
              Coming Soon
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </div>
    </Card>
  )
}
