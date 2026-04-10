import {
  Zap,
  Mail,
  GitBranch,
  Clock,
  Globe,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { messages } from '@/lib/messages'

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

export const NODE_TYPE_CONFIGS: Record<string, NodeTypeConfig> = {
  trigger: {
    icon: Zap,
    label: messages.workflows.editor.trigger,
    borderColor: 'border-l-4 border-l-orange-500',
    isTrigger: true,
  },
  send_email: {
    icon: Mail,
    label: messages.workflows.stepSendEmail,
    borderColor: 'border-l-4 border-l-blue-400',
    category: 'actions',
    description: messages.workflows.stepLibrary.descSendEmail,
  },
  condition: {
    icon: GitBranch,
    label: messages.workflows.stepCondition,
    borderColor: 'border-l-4 border-l-amber-400',
    category: 'logic',
    description: messages.workflows.stepLibrary.descCondition,
  },
  delay: {
    icon: Clock,
    label: messages.workflows.stepDelay,
    borderColor: 'border-l-4 border-l-muted-foreground',
    category: 'logic',
    description: messages.workflows.stepLibrary.descDelay,
  },
  webhook: {
    icon: Globe,
    label: messages.workflows.stepWebhook,
    borderColor: 'border-l-4 border-l-blue-400',
    category: 'actions',
    description: messages.workflows.stepLibrary.descWebhook,
  },
  ai_action: {
    icon: Sparkles,
    label: messages.workflows.stepAiAction,
    borderColor: 'border-l-4 border-l-blue-400',
    category: 'ai',
    description: messages.workflows.stepLibrary.descAiAction,
  },
}

/** Trigger-specific subtypes share the trigger border/icon */
export const TRIGGER_SUBTYPE_CONFIGS: Record<string, NodeTypeConfig> = {
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
}

/**
 * Derived maps for backward compatibility with node components.
 * Node components import these instead of maintaining separate maps.
 */
const allConfigs = { ...NODE_TYPE_CONFIGS, ...TRIGGER_SUBTYPE_CONFIGS }

export const borderColors: Record<string, string> = Object.fromEntries(
  Object.entries(allConfigs).map(([key, config]) => [key, config.borderColor])
)

export const nodeIcons: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(allConfigs).map(([key, config]) => [key, config.icon])
)
