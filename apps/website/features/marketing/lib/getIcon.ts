/**
 * Icon Resolver
 *
 * Maps IconName type to lucide-react icon components.
 * Ensures type safety across marketing components.
 *
 * @module apps/website/features/marketing/lib/getIcon
 */

import {
  FileText,
  Clock,
  Users,
  Zap,
  Shield,
  Target,
  Check,
  ChevronRight,
  Star,
  Heart,
  Scale,
  Briefcase,
  Hourglass,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '../types'

/**
 * Map IconName to lucide-react icon component
 * Used by BenefitCard and other marketing components
 *
 * @param iconName - Icon name from IconName type
 * @returns Lucide React icon component
 * @throws Error if icon name is not found
 *
 * @example
 * const Icon = getIcon('zap')
 * return <Icon size={32} className="text-blue-600" />
 */
export function getIcon(iconName: IconName): LucideIcon {
  const iconMap: Record<IconName, LucideIcon> = {
    document: FileText,
    clock: Clock,
    users: Users,
    zap: Zap,
    shield: Shield,
    target: Target,
    check: Check,
    chevron: ChevronRight,
    star: Star,
    heart: Heart,
    scale: Scale,
    briefcase: Briefcase,
    hourglass: Hourglass,
    messages: MessageCircle,
  }

  const icon = iconMap[iconName]
  if (!icon) {
    throw new Error(`Icon "${iconName}" not found in icon map`)
  }

  return icon
}
