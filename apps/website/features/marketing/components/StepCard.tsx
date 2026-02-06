'use client'

import { Card, CardContent } from '@agency/ui'
import {
  FileText,
  Clock,
  Users,
  Zap,
  Shield,
  Target,
  CheckCircle,
  ChevronRight,
  Star,
  Heart,
  Scale,
  Briefcase,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '../types'

/**
 * Mapping of IconName to lucide-react components
 * Provides a type-safe way to render icons by name
 */
const ICON_MAP: Record<IconName, LucideIcon> = {
  document: FileText,
  clock: Clock,
  users: Users,
  zap: Zap,
  shield: Shield,
  target: Target,
  check: CheckCircle,
  chevron: ChevronRight,
  star: Star,
  heart: Heart,
  scale: Scale,
  briefcase: Briefcase,
  hourglass: Clock,
  messages: MessageSquare,
}

interface StepCardProps {
  /**
   * The step data containing title and description
   */
  step: {
    id: string
    title: string
    description: string
  }

  /**
   * The step number (1-6) for display in the numbered circle
   */
  stepNumber: number

  /**
   * The icon name from IconName type
   */
  icon: IconName
}

/**
 * StepCard Component
 *
 * Reusable card component for displaying individual steps in the "How It Works" section.
 * Features:
 * - Numbered circle badge (step number)
 * - Icon display with consistent sizing
 * - Title and description
 * - Responsive design with Tailwind CSS
 * - Accessible semantic HTML
 *
 * @example
 * ```tsx
 * <StepCard
 *   step={{
 *     id: 'step-1',
 *     title: 'Lawyer creates intake form',
 *     description: 'Build custom forms with 7 field types...'
 *   }}
 *   stepNumber={1}
 *   icon="document"
 * />
 * ```
 */
export function StepCard({ step, stepNumber, icon }: StepCardProps) {
  const IconComponent = ICON_MAP[icon]

  return (
    <Card className="relative h-full transition-all duration-300 hover:shadow-lg">
      {/* Step Number Badge */}
      <div className="absolute -top-4 -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md">
        {stepNumber}
      </div>

      <CardContent className="pt-8 pb-6">
        {/* Icon Container */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <IconComponent className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </CardContent>
    </Card>
  )
}
