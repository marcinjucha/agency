/**
 * Config panel registry — maps step/trigger types to panel components.
 * Adding a new panel = new file + registry entry here.
 *
 * IMPORTANT: Uses import-then-re-export (NOT barrel `export { X } from`)
 * due to Turbopack barrel re-export bug causing SSR chunk failures.
 */

import { TriggerConfigPanel } from './TriggerConfigPanel'
import { SendEmailConfigPanel } from './SendEmailConfigPanel'
import { ConditionConfigPanel } from './ConditionConfigPanel'
import { DelayConfigPanel } from './DelayConfigPanel'
import { WebhookConfigPanel } from './WebhookConfigPanel'
import { AiActionConfigPanel } from './AiActionConfigPanel'
import { ConfigPanelWrapper } from './ConfigPanelWrapper'
import type { StepType } from '../../step-registry'
import type { TriggerType } from '../../types'
import type { VariableItem } from '@agency/ui'

/** Props shared by all config panel components */
export interface ConfigPanelProps {
  nodeId: string
  stepType: string
  stepConfig: Record<string, unknown>
  /** Called when config values change. Optional triggerType for trigger panel only. */
  onChange: (config: Record<string, unknown>, triggerType?: TriggerType) => void
  /** Workflow's trigger type — needed by panels that show trigger-context variables */
  triggerType?: string
  /** Graph-aware grouped variables from upstream steps + trigger */
  availableVariables?: VariableItem[]
}

const TRIGGER_TYPES = new Set<string>([
  'survey_submitted',
  'booking_created',
  'lead_scored',
  'manual',
  'scheduled',
])

/**
 * Registry mapping step type to its config panel component.
 * Trigger types all resolve to TriggerConfigPanel (handled separately in getPanelComponent).
 */
const STEP_PANEL_REGISTRY: Record<StepType, React.ComponentType<ConfigPanelProps>> = {
  send_email: SendEmailConfigPanel,
  condition: ConditionConfigPanel,
  delay: DelayConfigPanel,
  webhook: WebhookConfigPanel,
  ai_action: AiActionConfigPanel,
}

/** Get the correct panel component for a given step type */
export function getPanelComponent(stepType: string): React.ComponentType<ConfigPanelProps> | null {
  if (TRIGGER_TYPES.has(stepType)) {
    return TriggerConfigPanel
  }
  return (STEP_PANEL_REGISTRY as Record<string, React.ComponentType<ConfigPanelProps>>)[stepType] ?? null
}

// Re-export components (import-then-re-export pattern)
const _ConfigPanelWrapper = ConfigPanelWrapper
const _TriggerConfigPanel = TriggerConfigPanel
const _SendEmailConfigPanel = SendEmailConfigPanel
const _ConditionConfigPanel = ConditionConfigPanel
const _DelayConfigPanel = DelayConfigPanel
const _WebhookConfigPanel = WebhookConfigPanel
const _AiActionConfigPanel = AiActionConfigPanel

export {
  _ConfigPanelWrapper as ConfigPanelWrapper,
  _TriggerConfigPanel as TriggerConfigPanel,
  _SendEmailConfigPanel as SendEmailConfigPanel,
  _ConditionConfigPanel as ConditionConfigPanel,
  _DelayConfigPanel as DelayConfigPanel,
  _WebhookConfigPanel as WebhookConfigPanel,
  _AiActionConfigPanel as AiActionConfigPanel,
}
