import {
  Zap,
  Mail,
  GitBranch,
  Clock,
  Globe,
  Sparkles,
  Database,
  PenLine,
  Link,
  MessageCircle,
  Phone,
  MessageSquare,
  Instagram,
  Calendar,
  RefreshCw,
  Send,
  Bell,
  CalendarCheck,
  CheckSquare,
  Table2,
  Linkedin,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react'
import { messages } from '@/lib/messages'
import { STEP_REGISTRY, PLACEHOLDER_REGISTRY } from '../../step-registry'
import type { StepType } from '../../step-registry'
import type { TriggerType } from '../../types'
import { STEP_TYPE_LABELS, getStepTypeDescription } from '../../utils/step-labels'

/**
 * Config-only node type definitions (no component imports).
 * Safe to import from any file, including outside dynamic() boundaries.
 *
 * Component map lives in WorkflowCanvas.tsx (inside dynamic boundary)
 * and is derived from NODE_TYPE_CONFIGS keys.
 */

export interface NodeTypeConfig {
  icon: LucideIcon
  label: string
  borderColor: string
  /** If true, this type appears in the "add node" dropdown as a trigger option */
  isTrigger?: boolean
  /** Category key for step library grouping (e.g. 'actions', 'logic', 'ai') */
  category?: string
  /** Short description shown in step library */
  description?: string
}

/**
 * Icon map — icons stay local (step-registry.ts is zero-dep, no Lucide imports).
 * Maps StepType string keys to LucideIcon components.
 */
const STEP_ICON_MAP: Record<StepType, LucideIcon> = {
  send_email: Mail,
  condition: GitBranch,
  delay: Clock,
  webhook: Globe,
  ai_action: Sparkles,
  get_response: Database,
  update_response: PenLine,
  get_survey_link: Link,
}

export const NODE_TYPE_CONFIGS: Record<StepType | 'trigger', NodeTypeConfig> = {
  // trigger is NOT in STEP_REGISTRY (different contract) — manual entry required
  trigger: {
    icon: Zap,
    label: messages.workflows.editor.trigger,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
    category: 'triggers',
    description: messages.workflows.stepLibrary.descTrigger,
  },
  // All step types derived from STEP_REGISTRY — borderColor, category, label, description from single source of truth
  ...Object.fromEntries(
    STEP_REGISTRY.map((s) => [
      s.id,
      {
        icon: STEP_ICON_MAP[s.id as StepType],
        label: STEP_TYPE_LABELS[s.id as StepType],
        borderColor: s.borderColor,
        category: s.category,
        description: getStepTypeDescription(s.id),
      } satisfies NodeTypeConfig,
    ])
  ) as Record<StepType, NodeTypeConfig>,
}

/** Trigger-specific subtypes share the trigger border/icon */
export const TRIGGER_SUBTYPE_CONFIGS: Record<TriggerType, NodeTypeConfig> = {
  survey_submitted: {
    icon: Zap,
    label: messages.workflows.triggerSurveySubmitted,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
  },
  booking_created: {
    icon: Zap,
    label: messages.workflows.triggerBookingCreated,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
  },
  lead_scored: {
    icon: Zap,
    label: messages.workflows.triggerLeadScored,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
  },
  manual: {
    icon: Zap,
    label: messages.workflows.triggerManual,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
  },
  scheduled: {
    icon: Zap,
    label: messages.workflows.triggerScheduled,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
  },
}

/** Icon map for placeholder step types — maps PLACEHOLDER_REGISTRY.iconName to LucideIcon */
export const PLACEHOLDER_ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle,
  Phone,
  MessageSquare,
  Instagram,
  Calendar,
  Clock,
  RefreshCw,
  Mail,
  Send,
  Bell,
  Database,
  CalendarCheck,
  CheckSquare,
  Table2,
  Globe,
  Linkedin,
  ListOrdered,
}

/** NodeTypeConfig map for all 19 placeholder step types */
export const PLACEHOLDER_NODE_CONFIGS: Record<string, NodeTypeConfig> = Object.fromEntries(
  PLACEHOLDER_REGISTRY.map((s) => [
    s.id,
    {
      icon: PLACEHOLDER_ICON_MAP[s.iconName] ?? Zap,
      label: s.label,
      borderColor: s.borderColor,
      category: 'additional',
      description: s.description,
    } satisfies NodeTypeConfig,
  ])
)

/**
 * Combined lookup map (step + trigger + placeholder types) for runtime lookups by arbitrary string.
 * Use this for runtime node data lookups where the type is unknown at compile time.
 * Use NODE_TYPE_CONFIGS / TRIGGER_SUBTYPE_CONFIGS / PLACEHOLDER_NODE_CONFIGS directly for compile-time complete maps.
 */
const allConfigs: Record<string, NodeTypeConfig> = {
  ...NODE_TYPE_CONFIGS,
  ...TRIGGER_SUBTYPE_CONFIGS,
  ...PLACEHOLDER_NODE_CONFIGS,
}

/** Runtime lookup by arbitrary string key — returns undefined for unknown types */
export function lookupNodeConfig(type: string): NodeTypeConfig | undefined {
  return allConfigs[type]
}

export const borderColors: Record<StepType | TriggerType | 'trigger', string> = Object.fromEntries(
  Object.entries(allConfigs).map(([key, config]) => [key, config.borderColor])
) as Record<StepType | TriggerType | 'trigger', string>

export const nodeIcons: Record<StepType | TriggerType | 'trigger', LucideIcon> = Object.fromEntries(
  Object.entries(allConfigs).map(([key, config]) => [key, config.icon])
) as Record<StepType | TriggerType | 'trigger', LucideIcon>
