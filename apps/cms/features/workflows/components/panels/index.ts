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
import { GetResponseConfigPanel } from './GetResponseConfigPanel'
import { GetSurveyLinkConfigPanel } from './GetSurveyLinkConfigPanel'
import { UpdateResponseConfigPanel } from './UpdateResponseConfigPanel'
import { PlaceholderStepPanel } from './PlaceholderStepPanel'
import { ConfigPanelWrapper } from './ConfigPanelWrapper'
import { PLACEHOLDER_STEP_MAP } from '../../step-registry'
import type { StepType } from '../../step-registry'
import type { TriggerType, SurveyOption, EmailTemplateOption } from '../../types'
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
  /** Pre-loaded survey list from route loader — eliminates per-panel useQuery call */
  surveys?: SurveyOption[]
  /** Pre-loaded email template list from route loader — eliminates per-panel useQuery call */
  emailTemplates?: EmailTemplateOption[]
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
  get_response: GetResponseConfigPanel,
  update_response: UpdateResponseConfigPanel,
  get_survey_link: GetSurveyLinkConfigPanel,
}

/** Get the correct panel component for a given step type */
export function getPanelComponent(stepType: string): React.ComponentType<ConfigPanelProps> | null {
  if (TRIGGER_TYPES.has(stepType)) {
    return TriggerConfigPanel
  }
  if (PLACEHOLDER_STEP_MAP[stepType]) {
    return PlaceholderStepPanel
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
const _GetResponseConfigPanel = GetResponseConfigPanel
const _GetSurveyLinkConfigPanel = GetSurveyLinkConfigPanel
const _UpdateResponseConfigPanel = UpdateResponseConfigPanel
const _PlaceholderStepPanel = PlaceholderStepPanel

export {
  _ConfigPanelWrapper as ConfigPanelWrapper,
  _TriggerConfigPanel as TriggerConfigPanel,
  _SendEmailConfigPanel as SendEmailConfigPanel,
  _ConditionConfigPanel as ConditionConfigPanel,
  _DelayConfigPanel as DelayConfigPanel,
  _WebhookConfigPanel as WebhookConfigPanel,
  _AiActionConfigPanel as AiActionConfigPanel,
  _GetResponseConfigPanel as GetResponseConfigPanel,
  _GetSurveyLinkConfigPanel as GetSurveyLinkConfigPanel,
  _UpdateResponseConfigPanel as UpdateResponseConfigPanel,
  _PlaceholderStepPanel as PlaceholderStepPanel,
}
