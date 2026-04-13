/**
 * In-code workflow templates.
 *
 * Each template defines a complete workflow structure (trigger + steps + edges).
 * When a user creates a workflow from a template, createWorkflowFromTemplate()
 * remaps all stable temp IDs to new UUIDs before inserting into the DB.
 *
 * Template step ID conventions:
 *   'condition-1', 'send-email-1', 'delay-1'  — stable slugs for edge remapping
 *
 * Note: Trigger steps ARE real workflow_steps executed by the n8n Orchestrator via
 * the Trigger Handler subworkflow. Templates include trigger steps for canvas hydration.
 */

import type { StepType } from '../step-registry'
import type { TriggerType } from '../types'

// --- Types ---

export type TemplateStep = {
  /** Stable temp ID used for edge source/target references within this template */
  tempId: string
  step_type: StepType | TriggerType
  step_config: Record<string, unknown>
  position_x: number
  position_y: number
}

export type TemplateEdge = {
  /** Matches a tempId from TemplateStep */
  source_temp_id: string
  /** Matches a tempId from TemplateStep */
  target_temp_id: string
  condition_branch?: string | null
  sort_order: number
}

export type WorkflowTemplate = {
  /** Stable slug used as the template identifier (URL-safe, no spaces) */
  id: string
  name: string
  description: string
  /** Emoji icon for UI display */
  icon: string
  trigger_type: 'survey_submitted' | 'booking_created' | 'lead_scored' | 'manual' | 'scheduled'
  trigger_config: Record<string, unknown>
  steps: TemplateStep[]
  edges: TemplateEdge[]
}

// --- Templates ---

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'form_confirmation',
    name: 'Potwierdzenie formularza',
    description:
      'Automatycznie wyślij email po wypełnieniu formularza. Opcjonalnie tylko dla kwalifikowanych leadów.',
    icon: '📋',
    trigger_type: 'survey_submitted',
    trigger_config: {},
    steps: [
      {
        tempId: 'trigger-1',
        step_type: 'survey_submitted',
        step_config: {},
        position_x: 50,
        position_y: 0,
      },
      {
        tempId: 'condition-1',
        step_type: 'condition',
        step_config: {
          type: 'condition',
          expression: 'overallScore >= 7',
        },
        position_x: 350,
        position_y: 0,
      },
      {
        tempId: 'send-email-1',
        step_type: 'send_email',
        step_config: {
          type: 'send_email',
          template_id: null,
          to_expression: '{{contact.email}}',
        },
        position_x: 650,
        position_y: 0,
      },
    ],
    edges: [
      {
        source_temp_id: 'trigger-1',
        target_temp_id: 'condition-1',
        condition_branch: null,
        sort_order: 0,
      },
      {
        source_temp_id: 'condition-1',
        target_temp_id: 'send-email-1',
        condition_branch: 'true',
        sort_order: 1,
      },
    ],
  },

  {
    id: 'booking_notification',
    name: 'Powiadomienie o rezerwacji',
    description: 'Wyślij email potwierdzający po złożeniu rezerwacji.',
    icon: '📅',
    trigger_type: 'booking_created',
    trigger_config: {},
    steps: [
      {
        tempId: 'trigger-1',
        step_type: 'booking_created',
        step_config: {},
        position_x: 50,
        position_y: 0,
      },
      {
        tempId: 'send-email-1',
        step_type: 'send_email',
        step_config: {
          type: 'send_email',
          template_id: null,
          to_expression: '{{contact.email}}',
        },
        position_x: 350,
        position_y: 0,
      },
    ],
    edges: [
      {
        source_temp_id: 'trigger-1',
        target_temp_id: 'send-email-1',
        condition_branch: null,
        sort_order: 0,
      },
    ],
  },

  {
    id: 'follow_up',
    name: 'Follow-up po kwalifikacji',
    description: 'Czekaj 2 dni po wycenie leada i wyślij email do wysoko punktowanych.',
    icon: '⏰',
    trigger_type: 'lead_scored',
    trigger_config: {},
    steps: [
      {
        tempId: 'trigger-1',
        step_type: 'lead_scored',
        step_config: {},
        position_x: 50,
        position_y: 0,
      },
      {
        tempId: 'condition-1',
        step_type: 'condition',
        step_config: {
          type: 'condition',
          expression: 'overallScore >= 5',
        },
        position_x: 350,
        position_y: 0,
      },
      {
        tempId: 'delay-1',
        step_type: 'delay',
        step_config: {
          type: 'delay',
          value: 2,
          unit: 'days',
        },
        position_x: 650,
        position_y: 0,
      },
      {
        tempId: 'send-email-1',
        step_type: 'send_email',
        step_config: {
          type: 'send_email',
          template_id: null,
          to_expression: '{{contact.email}}',
        },
        position_x: 950,
        position_y: 0,
      },
    ],
    edges: [
      {
        source_temp_id: 'trigger-1',
        target_temp_id: 'condition-1',
        condition_branch: null,
        sort_order: 0,
      },
      {
        source_temp_id: 'condition-1',
        target_temp_id: 'delay-1',
        condition_branch: 'true',
        sort_order: 1,
      },
      {
        source_temp_id: 'delay-1',
        target_temp_id: 'send-email-1',
        condition_branch: null,
        sort_order: 2,
      },
    ],
  },
]
