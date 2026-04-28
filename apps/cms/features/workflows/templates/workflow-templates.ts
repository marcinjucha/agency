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

import type { StepType, PlaceholderStepType } from '../step-registry'
import type { TriggerType } from '../types'

// --- Types ---

export type TemplateStep = {
  /** Stable temp ID used for edge source/target references within this template */
  tempId: string
  step_type: StepType | TriggerType | PlaceholderStepType
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

  // ====== Showcase Templates (AAA-T-211) — placeholder steps, never executed ======
  {
    id: '24_7_intake',
    name: 'Obsługa zapytań 24/7',
    description:
      'Multi-channel intake — odbieraj zapytania z 5 kanałów, kwalifikuj AI, kieruj do gorących/ciepłych/zimnych ścieżek.',
    icon: '🌐',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      { tempId: 'trigger-whatsapp', step_type: 'whatsapp_message' as PlaceholderStepType, step_config: { phone: '+48 XXX XXX XXX' }, position_x: 50, position_y: 0 },
      { tempId: 'trigger-email',    step_type: 'email_received'   as PlaceholderStepType, step_config: { email: 'biuro@firma.pl' }, position_x: 50, position_y: 100 },
      { tempId: 'trigger-form',     step_type: 'survey_submitted' as TriggerType,         step_config: {}, position_x: 50, position_y: 200 },
      { tempId: 'trigger-fb',       step_type: 'facebook_message' as PlaceholderStepType, step_config: { page: 'Halo Efekt' }, position_x: 50, position_y: 300 },
      { tempId: 'trigger-ig',       step_type: 'instagram_dm'     as PlaceholderStepType, step_config: { account: '@haloefekt' }, position_x: 50, position_y: 400 },
      { tempId: 'get-response-1', step_type: 'get_response' as StepType, step_config: { type: 'get_response', responseIdExpression: '{{responseId}}' }, position_x: 370, position_y: 200 },
      { tempId: 'ai-score', step_type: 'ai_action' as StepType, step_config: { type: 'ai_action', prompt: 'Oceń lead na podstawie odpowiedzi. Zwróć overallScore (0-100), urgencyScore, valueScore, recommendation.', model: null, output_schema: null }, position_x: 690, position_y: 200 },
      { tempId: 'cond-tier', step_type: 'condition' as StepType, step_config: { type: 'condition', expression: 'overallScore >= 70 ? "hot" : overallScore >= 40 ? "warm" : "cold"' }, position_x: 1010, position_y: 200 },
      { tempId: 'hot-slack',      step_type: 'send_slack'      as PlaceholderStepType, step_config: { platform: 'Slack', channel: '#sprzedaz-hot', message: 'GORĄCY LEAD: {{respondentName}} (score: {{overallScore}})' }, position_x: 1330, position_y: 0 },
      { tempId: 'warm-email',     step_type: 'send_email'      as StepType,            step_config: { type: 'send_email', template_id: null, to_expression: '{{contact.email}}' }, position_x: 1330, position_y: 200 },
      { tempId: 'cold-sequence',  step_type: 'email_sequence'  as PlaceholderStepType, step_config: { name: 'Nurturing Cold', count: 12, interval: 7 }, position_x: 1330, position_y: 400 },
    ],
    edges: [
      { source_temp_id: 'trigger-whatsapp', target_temp_id: 'get-response-1', condition_branch: null, sort_order: 0 },
      { source_temp_id: 'trigger-email',    target_temp_id: 'get-response-1', condition_branch: null, sort_order: 1 },
      { source_temp_id: 'trigger-form',     target_temp_id: 'get-response-1', condition_branch: null, sort_order: 2 },
      { source_temp_id: 'trigger-fb',       target_temp_id: 'get-response-1', condition_branch: null, sort_order: 3 },
      { source_temp_id: 'trigger-ig',       target_temp_id: 'get-response-1', condition_branch: null, sort_order: 4 },
      { source_temp_id: 'get-response-1',   target_temp_id: 'ai-score',       condition_branch: null, sort_order: 5 },
      { source_temp_id: 'ai-score',         target_temp_id: 'cond-tier',      condition_branch: null, sort_order: 6 },
      { source_temp_id: 'cond-tier',        target_temp_id: 'hot-slack',      condition_branch: 'hot',  sort_order: 7 },
      { source_temp_id: 'cond-tier',        target_temp_id: 'warm-email',     condition_branch: 'warm', sort_order: 8 },
      { source_temp_id: 'cond-tier',        target_temp_id: 'cold-sequence',  condition_branch: 'cold', sort_order: 9 },
    ],
  },

  {
    id: 'follow_up_scoring',
    name: 'Follow-up Hot/Warm/Cold',
    description:
      'Formularz → AI scoring 0–100 → 3 ścieżki nurturingu z różnymi opóźnieniami i sekwencjami.',
    icon: '🎯',
    trigger_type: 'survey_submitted',
    trigger_config: {},
    steps: [
      { tempId: 'trigger-1', step_type: 'survey_submitted' as TriggerType, step_config: {}, position_x: 50, position_y: 180 },
      { tempId: 'get-response-1', step_type: 'get_response' as StepType, step_config: { type: 'get_response', responseIdExpression: '{{responseId}}' }, position_x: 370, position_y: 180 },
      { tempId: 'ai-score', step_type: 'ai_action' as StepType, step_config: { type: 'ai_action', prompt: 'Oceń lead 0-100. Zwróć overallScore + recommendation (hot/warm/cold).', model: null, output_schema: null }, position_x: 690, position_y: 180 },
      { tempId: 'cond-tier', step_type: 'condition' as StepType, step_config: { type: 'condition', expression: 'overallScore >= 70 ? "hot" : overallScore >= 40 ? "warm" : "cold"' }, position_x: 1010, position_y: 180 },
      { tempId: 'hot-delay',  step_type: 'delay' as StepType, step_config: { type: 'delay', value: 1, unit: 'hours' }, position_x: 1330, position_y: 0 },
      { tempId: 'hot-email',  step_type: 'send_email' as StepType, step_config: { type: 'send_email', template_id: null, to_expression: '{{contact.email}}' }, position_x: 1650, position_y: 0 },
      { tempId: 'warm-delay', step_type: 'delay' as StepType, step_config: { type: 'delay', value: 24, unit: 'hours' }, position_x: 1330, position_y: 180 },
      { tempId: 'warm-email', step_type: 'send_email' as StepType, step_config: { type: 'send_email', template_id: null, to_expression: '{{contact.email}}' }, position_x: 1650, position_y: 180 },
      { tempId: 'cold-delay',    step_type: 'delay' as StepType,          step_config: { type: 'delay', value: 7, unit: 'days' }, position_x: 1330, position_y: 360 },
      { tempId: 'cold-sequence', step_type: 'email_sequence' as PlaceholderStepType, step_config: { name: 'Nurturing Cold', count: 12, interval: 7 }, position_x: 1650, position_y: 360 },
    ],
    edges: [
      { source_temp_id: 'trigger-1',      target_temp_id: 'get-response-1', condition_branch: null,   sort_order: 0 },
      { source_temp_id: 'get-response-1', target_temp_id: 'ai-score',       condition_branch: null,   sort_order: 1 },
      { source_temp_id: 'ai-score',       target_temp_id: 'cond-tier',      condition_branch: null,   sort_order: 2 },
      { source_temp_id: 'cond-tier',      target_temp_id: 'hot-delay',      condition_branch: 'hot',  sort_order: 3 },
      { source_temp_id: 'cond-tier',      target_temp_id: 'warm-delay',     condition_branch: 'warm', sort_order: 4 },
      { source_temp_id: 'cond-tier',      target_temp_id: 'cold-delay',     condition_branch: 'cold', sort_order: 5 },
      { source_temp_id: 'hot-delay',      target_temp_id: 'hot-email',      condition_branch: null,   sort_order: 6 },
      { source_temp_id: 'warm-delay',     target_temp_id: 'warm-email',     condition_branch: null,   sort_order: 7 },
      { source_temp_id: 'cold-delay',     target_temp_id: 'cold-sequence',  condition_branch: null,   sort_order: 8 },
    ],
  },

  {
    id: 'ai_meeting_brief',
    name: 'Research AI przed spotkaniem',
    description:
      '60 min przed spotkaniem — pobierz dane z CRM, scrape strony klienta, wyszukaj LinkedIn, AI generuje brief, email do handlowca.',
    icon: '🔍',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      { tempId: 'trigger-1',   step_type: 'calendar_event' as PlaceholderStepType, step_config: { calendar: 'Główny kalendarz', minutesBefore: 60 }, position_x: 50, position_y: 0 },
      { tempId: 'crm-data',    step_type: 'get_crm_data'   as PlaceholderStepType, step_config: { crm: 'Pipedrive', query: 'Kontakt' }, position_x: 370, position_y: 0 },
      { tempId: 'scraper',     step_type: 'web_scraper'    as PlaceholderStepType, step_config: { url: '{{clientWebsite}}', selector: 'Opis firmy, produkty, oferta' }, position_x: 690, position_y: 0 },
      { tempId: 'linkedin',    step_type: 'linkedin_lookup' as PlaceholderStepType, step_config: { query: '{{companyName}}', type: 'Firma' }, position_x: 1010, position_y: 0 },
      { tempId: 'ai-brief',    step_type: 'ai_action' as StepType, step_config: { type: 'ai_action', prompt: 'Wygeneruj brief 3-akapitowy: kim jest klient, co go wyróżnia, jakie pytania zadać na spotkaniu.', model: null, output_schema: null }, position_x: 1330, position_y: 0 },
      { tempId: 'email-brief', step_type: 'send_email' as StepType, step_config: { type: 'send_email', template_id: null, to_expression: '{{salesperson.email}}' }, position_x: 1650, position_y: 0 },
    ],
    edges: [
      { source_temp_id: 'trigger-1', target_temp_id: 'crm-data',    condition_branch: null, sort_order: 0 },
      { source_temp_id: 'crm-data',  target_temp_id: 'scraper',     condition_branch: null, sort_order: 1 },
      { source_temp_id: 'scraper',   target_temp_id: 'linkedin',    condition_branch: null, sort_order: 2 },
      { source_temp_id: 'linkedin',  target_temp_id: 'ai-brief',    condition_branch: null, sort_order: 3 },
      { source_temp_id: 'ai-brief',  target_temp_id: 'email-brief', condition_branch: null, sort_order: 4 },
    ],
  },

  {
    id: 'daily_ceo_report',
    name: 'Dzienny raport CEO',
    description:
      '7:00 codziennie — pobierz dane z CRM, agreguj w Google Sheets, AI analizuje trendy, wyślij raport email + powiadomienie Slack.',
    icon: '📊',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      { tempId: 'trigger-1',   step_type: 'schedule'      as PlaceholderStepType, step_config: { frequency: 'Codziennie', time: '07:00' }, position_x: 50, position_y: 180 },
      { tempId: 'crm-data',    step_type: 'get_crm_data'  as PlaceholderStepType, step_config: { crm: 'Pipedrive', query: 'Deal' }, position_x: 370, position_y: 180 },
      { tempId: 'sheets',      step_type: 'google_sheets' as PlaceholderStepType, step_config: { sheetId: '1BxiMVs0XRA...', tab: 'Daily Report', mode: 'Aktualizacja' }, position_x: 690, position_y: 180 },
      { tempId: 'ai-analysis', step_type: 'ai_action' as StepType, step_config: { type: 'ai_action', prompt: 'Przeanalizuj dane sprzedażowe. Zidentyfikuj trendy, anomalie, top 3 priorytety na dziś.', model: null, output_schema: null }, position_x: 1010, position_y: 180 },
      { tempId: 'email-ceo',   step_type: 'send_email' as StepType, step_config: { type: 'send_email', template_id: null, to_expression: 'ceo@firma.pl' }, position_x: 1330, position_y: 80 },
      { tempId: 'slack-team',  step_type: 'send_slack' as PlaceholderStepType, step_config: { platform: 'Slack', channel: '#zarzad', message: 'Daily Report gotowy: {{ai-analysis.summary}}' }, position_x: 1330, position_y: 280 },
    ],
    edges: [
      { source_temp_id: 'trigger-1',   target_temp_id: 'crm-data',    condition_branch: null, sort_order: 0 },
      { source_temp_id: 'crm-data',    target_temp_id: 'sheets',      condition_branch: null, sort_order: 1 },
      { source_temp_id: 'sheets',      target_temp_id: 'ai-analysis', condition_branch: null, sort_order: 2 },
      { source_temp_id: 'ai-analysis', target_temp_id: 'email-ceo',   condition_branch: null, sort_order: 3 },
      { source_temp_id: 'ai-analysis', target_temp_id: 'slack-team',  condition_branch: null, sort_order: 4 },
    ],
  },

  {
    id: 'client_onboarding',
    name: 'Onboarding nowego klienta',
    description:
      'Deal closed w CRM → email powitalny → utworzenie zadań → SMS przypomnienie → wait 7 dni → AI check-in → email feedback.',
    icon: '🤝',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      { tempId: 'trigger-1',      step_type: 'crm_status_change' as PlaceholderStepType, step_config: { crm: 'Pipedrive', fromStatus: 'Negocjacje', toStatus: 'Klient' }, position_x: 50, position_y: 0 },
      { tempId: 'welcome-email',  step_type: 'send_email' as StepType, step_config: { type: 'send_email', template_id: null, to_expression: '{{contact.email}}' }, position_x: 370, position_y: 0 },
      { tempId: 'create-tasks',   step_type: 'create_task' as PlaceholderStepType, step_config: { system: 'Asana', title: 'Onboarding: {{clientName}}', assignTo: 'Account Manager' }, position_x: 690, position_y: 0 },
      { tempId: 'sms-reminder',   step_type: 'send_sms' as PlaceholderStepType, step_config: { to: '{{clientPhone}}', message: 'Witaj w Halo Efekt! Spotkanie kick-off jutro o 10:00.' }, position_x: 1010, position_y: 0 },
      { tempId: 'wait-7d',        step_type: 'delay' as StepType, step_config: { type: 'delay', value: 7, unit: 'days' }, position_x: 1330, position_y: 0 },
      { tempId: 'ai-checkin',     step_type: 'ai_action' as StepType, step_config: { type: 'ai_action', prompt: 'Przeanalizuj aktywność klienta w pierwszym tygodniu. Zaproponuj treść maila check-in.', model: null, output_schema: null }, position_x: 1650, position_y: 0 },
      { tempId: 'feedback-email', step_type: 'send_email' as StepType, step_config: { type: 'send_email', template_id: null, to_expression: '{{contact.email}}' }, position_x: 1970, position_y: 0 },
    ],
    edges: [
      { source_temp_id: 'trigger-1',      target_temp_id: 'welcome-email',  condition_branch: null, sort_order: 0 },
      { source_temp_id: 'welcome-email',  target_temp_id: 'create-tasks',   condition_branch: null, sort_order: 1 },
      { source_temp_id: 'create-tasks',   target_temp_id: 'sms-reminder',   condition_branch: null, sort_order: 2 },
      { source_temp_id: 'sms-reminder',   target_temp_id: 'wait-7d',        condition_branch: null, sort_order: 3 },
      { source_temp_id: 'wait-7d',        target_temp_id: 'ai-checkin',     condition_branch: null, sort_order: 4 },
      { source_temp_id: 'ai-checkin',     target_temp_id: 'feedback-email', condition_branch: null, sort_order: 5 },
    ],
  },
]
