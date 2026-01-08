/**
 * FeatureCard Component
 *
 * Reusable card component for displaying individual features in the Features section.
 * Each card displays an icon, headline, description, and optional "Coming Soon" badge.
 *
 * @module apps/website/features/marketing/components/FeatureCard
 */

import { Card, Badge } from '@legal-mind/ui'
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
      className={`h-full p-6 flex flex-col transition-all duration-200 ${
        feature.isComingSoon
          ? 'opacity-75 hover:shadow-md'
          : 'hover:shadow-lg'
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mb-4">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-lg ${
            feature.isComingSoon
              ? 'bg-gray-100'
              : 'bg-blue-100'
          }`}
        >
          <IconComponent
            className={`w-6 h-6 ${
              feature.isComingSoon
                ? 'text-gray-400'
                : 'text-blue-600'
            }`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow">
        {/* Headline with Coming Soon Badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {feature.name}
          </h3>
          {feature.isComingSoon && (
            <Badge
              variant="secondary"
              className="flex-shrink-0 text-xs whitespace-nowrap bg-gray-200 text-gray-700"
            >
              Coming Soon
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className={`text-sm leading-relaxed ${
          feature.isComingSoon
            ? 'text-gray-500'
            : 'text-gray-600'
        }`}>
          {feature.description}
        </p>
      </div>
    </Card>
  )
}
