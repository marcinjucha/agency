// Maps content.ts IconKey values to lucide-react icon components.
// The prototype used a custom inline icon set (stroke 1.75); we translate to
// lucide-react (project dependency). Set strokeWidth={1.75} at the call site
// where fidelity to the prototype's thinner stroke matters.
import {
  Users,
  FileText,
  Layers,
  Sparkles,
  Brain,
  TrendingUp,
  Hand,
  Heart,
  Compass,
  type LucideIcon,
} from 'lucide-react'

import type { IconKey } from '../content'

export const ICON_MAP: Record<IconKey, LucideIcon> = {
  users: Users,
  file: FileText,
  layers: Layers,
  spark: Sparkles,
  brain: Brain,
  trend: TrendingUp,
  hand: Hand,
  heart: Heart,
  compass: Compass,
}
