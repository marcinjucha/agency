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
      {
        tempId: 'trigger-whatsapp',
        step_type: 'whatsapp_message' as PlaceholderStepType,
        step_config: { _name: 'Wiadomość WhatsApp', phone: '+48 XXX XXX XXX' },
        position_x: 50, position_y: 0,
      },
      {
        tempId: 'trigger-email',
        step_type: 'email_received' as PlaceholderStepType,
        step_config: { _name: 'Email przychodzący', email: 'biuro@firma.pl' },
        position_x: 50, position_y: 110,
      },
      {
        tempId: 'trigger-form',
        step_type: 'survey_submitted' as TriggerType,
        step_config: { _name: 'Formularz kontaktowy' },
        position_x: 50, position_y: 220,
      },
      {
        tempId: 'trigger-fb',
        step_type: 'facebook_message' as PlaceholderStepType,
        step_config: { _name: 'Wiadomość Facebook', page: 'Halo Efekt' },
        position_x: 50, position_y: 330,
      },
      {
        tempId: 'trigger-ig',
        step_type: 'instagram_dm' as PlaceholderStepType,
        step_config: { _name: 'Instagram DM', account: '@haloefekt' },
        position_x: 50, position_y: 440,
      },
      {
        tempId: 'get-response',
        step_type: 'get_response' as StepType,
        step_config: { type: 'get_response', _name: 'Pobierz dane leada', responseIdExpression: '{{responseId}}' },
        position_x: 380, position_y: 220,
      },
      {
        tempId: 'ai-score',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'Ocena AI (0–100)', prompt: 'Oceń lead 0-100. Zwróć overallScore, urgencyScore, recommendation.', model: null, output_schema: null },
        position_x: 710, position_y: 220,
      },
      {
        tempId: 'cond-hot',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Czy gorący lead (≥70)?', expression: 'overallScore >= 70' },
        position_x: 1040, position_y: 220,
      },
      {
        tempId: 'slack-hot',
        step_type: 'send_slack' as PlaceholderStepType,
        step_config: { _name: 'Alert Slack – Hot!', platform: 'Slack', channel: '#sprzedaz-hot', message: '🔥 GORĄCY LEAD: {{respondentName}} (score: {{overallScore}})' },
        position_x: 1370, position_y: 60,
      },
      {
        tempId: 'update-crm-hot',
        step_type: 'update_crm' as PlaceholderStepType,
        step_config: { _name: 'CRM: Status = Gorący', crm: 'Pipedrive', field: 'status', value: 'Gorący lead' },
        position_x: 1700, position_y: 60,
      },
      {
        tempId: 'whatsapp-hot',
        step_type: 'send_whatsapp' as PlaceholderStepType,
        step_config: { _name: 'WhatsApp do handlowca', to: '{{salesperson.phone}}', message: 'Gorący lead czeka! {{respondentName}} - zadzwoń teraz.' },
        position_x: 2030, position_y: 60,
      },
      {
        tempId: 'cond-warm',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Czy ciepły lead (≥40)?', expression: 'overallScore >= 40' },
        position_x: 1370, position_y: 400,
      },
      {
        tempId: 'email-warm',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Materiały PDF', template_id: null, to_expression: '{{contact.email}}' },
        position_x: 1700, position_y: 280,
      },
      {
        tempId: 'delay-warm',
        step_type: 'delay' as StepType,
        step_config: { type: 'delay', _name: 'Czekaj 24h', value: 24, unit: 'hours' },
        position_x: 2030, position_y: 280,
      },
      {
        tempId: 'email-cold',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Treści edukacyjne', template_id: null, to_expression: '{{contact.email}}' },
        position_x: 1700, position_y: 520,
      },
      {
        tempId: 'email-sequence',
        step_type: 'email_sequence' as PlaceholderStepType,
        step_config: { _name: 'Sekwencja 12 emaili', name: 'Nurturing Cold', count: 12, interval: 7 },
        position_x: 2030, position_y: 520,
      },
    ],
    edges: [
      { source_temp_id: 'trigger-whatsapp', target_temp_id: 'get-response', condition_branch: null, sort_order: 0 },
      { source_temp_id: 'trigger-email',    target_temp_id: 'get-response', condition_branch: null, sort_order: 1 },
      { source_temp_id: 'trigger-form',     target_temp_id: 'get-response', condition_branch: null, sort_order: 2 },
      { source_temp_id: 'trigger-fb',       target_temp_id: 'get-response', condition_branch: null, sort_order: 3 },
      { source_temp_id: 'trigger-ig',       target_temp_id: 'get-response', condition_branch: null, sort_order: 4 },
      { source_temp_id: 'get-response',     target_temp_id: 'ai-score',     condition_branch: null, sort_order: 5 },
      { source_temp_id: 'ai-score',         target_temp_id: 'cond-hot',     condition_branch: null, sort_order: 6 },
      { source_temp_id: 'cond-hot',         target_temp_id: 'slack-hot',    condition_branch: 'true',  sort_order: 7 },
      { source_temp_id: 'cond-hot',         target_temp_id: 'cond-warm',    condition_branch: 'false', sort_order: 8 },
      { source_temp_id: 'slack-hot',        target_temp_id: 'update-crm-hot', condition_branch: null, sort_order: 9 },
      { source_temp_id: 'update-crm-hot',   target_temp_id: 'whatsapp-hot', condition_branch: null, sort_order: 10 },
      { source_temp_id: 'cond-warm',        target_temp_id: 'email-warm',   condition_branch: 'true',  sort_order: 11 },
      { source_temp_id: 'cond-warm',        target_temp_id: 'email-cold',   condition_branch: 'false', sort_order: 12 },
      { source_temp_id: 'email-warm',       target_temp_id: 'delay-warm',   condition_branch: null, sort_order: 13 },
      { source_temp_id: 'email-cold',       target_temp_id: 'email-sequence', condition_branch: null, sort_order: 14 },
    ],
  },

  {
    id: 'follow_up_scoring',
    name: 'Follow-up Hot/Warm/Cold',
    description:
      'Formularz → AI scoring 0–100 → 3 ścieżki nurturingu z różnymi opóźnieniami i sekwencjami.',
    icon: '🎯',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      {
        tempId: 'trigger-1',
        step_type: 'survey_submitted' as TriggerType,
        step_config: { _name: 'Formularz wypełniony' },
        position_x: 50, position_y: 220,
      },
      {
        tempId: 'get-response',
        step_type: 'get_response' as StepType,
        step_config: { type: 'get_response', _name: 'Pobierz odpowiedzi', responseIdExpression: '{{responseId}}' },
        position_x: 380, position_y: 220,
      },
      {
        tempId: 'ai-score',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'Scoring AI 0–100', prompt: 'Oceń lead 0-100. Zwróć overallScore + hot/warm/cold recommendation.', model: null, output_schema: null },
        position_x: 710, position_y: 220,
      },
      {
        tempId: 'cond-hot',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Score ≥70 (Gorący)?', expression: 'overallScore >= 70' },
        position_x: 1040, position_y: 220,
      },
      {
        tempId: 'delay-hot',
        step_type: 'delay' as StepType,
        step_config: { type: 'delay', _name: 'Czekaj 1h', value: 1, unit: 'hours' },
        position_x: 1370, position_y: 60,
      },
      {
        tempId: 'email-hot',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Oferta premium', template_id: null, to_expression: '{{contact.email}}' },
        position_x: 1700, position_y: 60,
      },
      {
        tempId: 'whatsapp-hot',
        step_type: 'send_whatsapp' as PlaceholderStepType,
        step_config: { _name: 'WhatsApp: Pilny kontakt', to: '{{contact.phone}}', message: 'Cześć {{firstName}}, widzę że masz pilną potrzebę. Zadzwońmy dziś!' },
        position_x: 2030, position_y: 60,
      },
      {
        tempId: 'cond-warm',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Score ≥40 (Ciepły)?', expression: 'overallScore >= 40' },
        position_x: 1370, position_y: 380,
      },
      {
        tempId: 'delay-warm',
        step_type: 'delay' as StepType,
        step_config: { type: 'delay', _name: 'Czekaj 24h', value: 24, unit: 'hours' },
        position_x: 1700, position_y: 260,
      },
      {
        tempId: 'email-warm',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Case study', template_id: null, to_expression: '{{contact.email}}' },
        position_x: 2030, position_y: 260,
      },
      {
        tempId: 'update-crm-cold',
        step_type: 'update_crm' as PlaceholderStepType,
        step_config: { _name: 'CRM: Oznacz jako zimny', crm: 'Pipedrive', field: 'status', value: 'Zimny lead' },
        position_x: 1700, position_y: 500,
      },
      {
        tempId: 'email-sequence',
        step_type: 'email_sequence' as PlaceholderStepType,
        step_config: { _name: 'Sekwencja edukacyjna 8 emaili', name: 'Nurturing Cold', count: 8, interval: 7 },
        position_x: 2030, position_y: 500,
      },
    ],
    edges: [
      { source_temp_id: 'trigger-1',       target_temp_id: 'get-response',    condition_branch: null,    sort_order: 0 },
      { source_temp_id: 'get-response',     target_temp_id: 'ai-score',        condition_branch: null,    sort_order: 1 },
      { source_temp_id: 'ai-score',         target_temp_id: 'cond-hot',        condition_branch: null,    sort_order: 2 },
      { source_temp_id: 'cond-hot',         target_temp_id: 'delay-hot',       condition_branch: 'true',  sort_order: 3 },
      { source_temp_id: 'cond-hot',         target_temp_id: 'cond-warm',       condition_branch: 'false', sort_order: 4 },
      { source_temp_id: 'delay-hot',        target_temp_id: 'email-hot',       condition_branch: null,    sort_order: 5 },
      { source_temp_id: 'email-hot',        target_temp_id: 'whatsapp-hot',    condition_branch: null,    sort_order: 6 },
      { source_temp_id: 'cond-warm',        target_temp_id: 'delay-warm',      condition_branch: 'true',  sort_order: 7 },
      { source_temp_id: 'cond-warm',        target_temp_id: 'update-crm-cold', condition_branch: 'false', sort_order: 8 },
      { source_temp_id: 'delay-warm',       target_temp_id: 'email-warm',      condition_branch: null,    sort_order: 9 },
      { source_temp_id: 'update-crm-cold',  target_temp_id: 'email-sequence',  condition_branch: null,    sort_order: 10 },
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
      {
        tempId: 'trigger-1',
        step_type: 'calendar_event' as PlaceholderStepType,
        step_config: { _name: '60 min przed spotkaniem', calendar: 'Główny kalendarz', minutesBefore: 60 },
        position_x: 50, position_y: 130,
      },
      {
        tempId: 'crm-data',
        step_type: 'get_crm_data' as PlaceholderStepType,
        step_config: { _name: 'Dane z CRM', crm: 'Pipedrive', query: 'Kontakt + firma' },
        position_x: 380, position_y: 130,
      },
      {
        tempId: 'scraper',
        step_type: 'web_scraper' as PlaceholderStepType,
        step_config: { _name: 'Scraping strony klienta', url: '{{clientWebsite}}', selector: 'O nas, oferta, produkty' },
        position_x: 710, position_y: 130,
      },
      {
        tempId: 'linkedin',
        step_type: 'linkedin_lookup' as PlaceholderStepType,
        step_config: { _name: 'LinkedIn firmy', query: '{{companyName}}', type: 'Firma' },
        position_x: 1040, position_y: 130,
      },
      {
        tempId: 'ai-analyze',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'Analiza AI: profil klienta', prompt: 'Przeanalizuj dane klienta. Określ: branża, skala, bóle biznesowe, sygnały zakupowe, czy to kluczowy decydent.', model: null, output_schema: null },
        position_x: 1370, position_y: 130,
      },
      {
        tempId: 'cond-decision',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Kluczowy decydent?', expression: 'isDecisionMaker == true' },
        position_x: 1700, position_y: 130,
      },
      {
        tempId: 'ai-full-brief',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'Brief 5-stronicowy', prompt: 'Wygeneruj szczegółowy brief 5-stronicowy dla kluczowego decydenta. Zawrzyj: profil firmy, SWOT, pytania otwierające, obiekcje i odpowiedzi, rekomendację oferty.', model: null, output_schema: null },
        position_x: 2030, position_y: 0,
      },
      {
        tempId: 'email-full',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Pełny brief do teamu', template_id: null, to_expression: '{{salesperson.email}}' },
        position_x: 2360, position_y: 0,
      },
      {
        tempId: 'ai-quick-brief',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'Skrócone podsumowanie', prompt: 'Wygeneruj krótkie podsumowanie (1 strona): kim jest kontakt, 3 kluczowe fakty, 2 pytania otwierające.', model: null, output_schema: null },
        position_x: 2030, position_y: 260,
      },
      {
        tempId: 'email-quick',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Szybki brief', template_id: null, to_expression: '{{salesperson.email}}' },
        position_x: 2360, position_y: 260,
      },
    ],
    edges: [
      { source_temp_id: 'trigger-1',    target_temp_id: 'crm-data',       condition_branch: null,    sort_order: 0 },
      { source_temp_id: 'crm-data',     target_temp_id: 'scraper',        condition_branch: null,    sort_order: 1 },
      { source_temp_id: 'scraper',      target_temp_id: 'linkedin',       condition_branch: null,    sort_order: 2 },
      { source_temp_id: 'linkedin',     target_temp_id: 'ai-analyze',     condition_branch: null,    sort_order: 3 },
      { source_temp_id: 'ai-analyze',   target_temp_id: 'cond-decision',  condition_branch: null,    sort_order: 4 },
      { source_temp_id: 'cond-decision', target_temp_id: 'ai-full-brief', condition_branch: 'true',  sort_order: 5 },
      { source_temp_id: 'cond-decision', target_temp_id: 'ai-quick-brief', condition_branch: 'false', sort_order: 6 },
      { source_temp_id: 'ai-full-brief', target_temp_id: 'email-full',    condition_branch: null,    sort_order: 7 },
      { source_temp_id: 'ai-quick-brief', target_temp_id: 'email-quick',  condition_branch: null,    sort_order: 8 },
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
      {
        tempId: 'trigger-1',
        step_type: 'schedule' as PlaceholderStepType,
        step_config: { _name: 'Codziennie o 7:00', frequency: 'Codziennie', time: '07:00' },
        position_x: 50, position_y: 220,
      },
      {
        tempId: 'crm-data',
        step_type: 'get_crm_data' as PlaceholderStepType,
        step_config: { _name: 'Dane sprzedażowe z CRM', crm: 'Pipedrive', query: 'Deale + aktywność 24h' },
        position_x: 380, position_y: 220,
      },
      {
        tempId: 'sheets',
        step_type: 'google_sheets' as PlaceholderStepType,
        step_config: { _name: 'Aktualizacja Google Sheets', sheetId: '1BxiMVs0XRA...', tab: 'Daily Report', mode: 'Aktualizacja' },
        position_x: 710, position_y: 220,
      },
      {
        tempId: 'ai-analysis',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'Analiza AI: trendy i anomalie', prompt: 'Przeanalizuj dane sprzedażowe. Zidentyfikuj trendy, anomalie (>20% odchylenie), top 3 priorytety. Zwróć hasAnomaly (boolean) i summary.', model: null, output_schema: null },
        position_x: 1040, position_y: 220,
      },
      {
        tempId: 'cond-anomaly',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Wykryto problemy?', expression: 'hasAnomaly == true' },
        position_x: 1370, position_y: 220,
      },
      {
        tempId: 'slack-alert',
        step_type: 'send_slack' as PlaceholderStepType,
        step_config: { _name: 'Slack: ALERT zarząd', platform: 'Slack', channel: '#zarzad-alert', message: '🚨 ANOMALIA w danych sprzedażowych! {{ai-analysis.anomalyDescription}}' },
        position_x: 1700, position_y: 60,
      },
      {
        tempId: 'email-urgent',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email pilny: CEO', template_id: null, to_expression: 'ceo@firma.pl' },
        position_x: 2030, position_y: 60,
      },
      {
        tempId: 'create-task',
        step_type: 'create_task' as PlaceholderStepType,
        step_config: { _name: 'Zadanie: Analiza problemu', system: 'Asana', title: 'PILNE: Anomalia sprzedażowa {{date}}', assignTo: 'Head of Sales' },
        position_x: 2360, position_y: 60,
      },
      {
        tempId: 'email-report',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Dzienny raport CEO', template_id: null, to_expression: 'ceo@firma.pl' },
        position_x: 1700, position_y: 380,
      },
      {
        tempId: 'slack-summary',
        step_type: 'send_slack' as PlaceholderStepType,
        step_config: { _name: 'Slack: Podsumowanie #zarząd', platform: 'Slack', channel: '#zarzad', message: 'Daily Report gotowy ✅ {{ai-analysis.summary}}' },
        position_x: 2030, position_y: 380,
      },
      {
        tempId: 'sheets-log',
        step_type: 'google_sheets' as PlaceholderStepType,
        step_config: { _name: 'Zapis do archiwum Sheets', sheetId: '1BxiMVs0XRA...', tab: 'Historia raportów', mode: 'Dodaj wiersz' },
        position_x: 2360, position_y: 380,
      },
    ],
    edges: [
      { source_temp_id: 'trigger-1',    target_temp_id: 'crm-data',      condition_branch: null,    sort_order: 0 },
      { source_temp_id: 'crm-data',     target_temp_id: 'sheets',        condition_branch: null,    sort_order: 1 },
      { source_temp_id: 'sheets',       target_temp_id: 'ai-analysis',   condition_branch: null,    sort_order: 2 },
      { source_temp_id: 'ai-analysis',  target_temp_id: 'cond-anomaly',  condition_branch: null,    sort_order: 3 },
      { source_temp_id: 'cond-anomaly', target_temp_id: 'slack-alert',   condition_branch: 'true',  sort_order: 4 },
      { source_temp_id: 'cond-anomaly', target_temp_id: 'email-report',  condition_branch: 'false', sort_order: 5 },
      { source_temp_id: 'slack-alert',  target_temp_id: 'email-urgent',  condition_branch: null,    sort_order: 6 },
      { source_temp_id: 'email-urgent', target_temp_id: 'create-task',   condition_branch: null,    sort_order: 7 },
      { source_temp_id: 'email-report', target_temp_id: 'slack-summary', condition_branch: null,    sort_order: 8 },
      { source_temp_id: 'slack-summary', target_temp_id: 'sheets-log',   condition_branch: null,    sort_order: 9 },
    ],
  },

  {
    id: 'client_onboarding',
    name: 'Onboarding nowego klienta',
    description:
      'Deal closed w CRM → email powitalny → zadania Asana → SMS kick-off → czekaj 24h → sprawdź aktywność → spersonalizowany check-in lub eskalacja do AM.',
    icon: '🤝',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      {
        tempId: 'trigger-1',
        step_type: 'crm_status_change' as PlaceholderStepType,
        step_config: { _name: 'Deal zamknięty w CRM', crm: 'Pipedrive', fromStatus: 'Negocjacje', toStatus: 'Klient' },
        position_x: 50, position_y: 220,
      },
      {
        tempId: 'welcome-email',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email powitalny', template_id: null, to_expression: '{{contact.email}}' },
        position_x: 380, position_y: 220,
      },
      {
        tempId: 'create-tasks',
        step_type: 'create_task' as PlaceholderStepType,
        step_config: { _name: 'Zadania onboardingowe w Asana', system: 'Asana', title: 'Onboarding: {{clientName}}', assignTo: 'Account Manager' },
        position_x: 710, position_y: 220,
      },
      {
        tempId: 'sms-kickoff',
        step_type: 'send_sms' as PlaceholderStepType,
        step_config: { _name: 'SMS: Kick-off jutro o 10:00', to: '{{clientPhone}}', message: 'Witaj w Halo Efekt! Spotkanie kick-off jutro o 10:00. Odpisz TAK, by potwierdzić.' },
        position_x: 1040, position_y: 220,
      },
      {
        tempId: 'delay-24h',
        step_type: 'delay' as StepType,
        step_config: { type: 'delay', _name: 'Czekaj 24h', value: 24, unit: 'hours' },
        position_x: 1370, position_y: 220,
      },
      {
        tempId: 'cond-active',
        step_type: 'condition' as StepType,
        step_config: { type: 'condition', _name: 'Klient zalogował się?', expression: 'clientLoggedIn == true' },
        position_x: 1700, position_y: 220,
      },
      {
        tempId: 'ai-personalized',
        step_type: 'ai_action' as StepType,
        step_config: { type: 'ai_action', _name: 'AI: Personalizacja check-in', prompt: 'Na podstawie aktywności klienta w pierwszych 24h wygeneruj spersonalizowaną wiadomość check-in. Podkreśl postęp, zaproponuj kolejny krok.', model: null, output_schema: null },
        position_x: 2030, position_y: 60,
      },
      {
        tempId: 'email-personalized',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Spersonalizowany check-in', template_id: null, to_expression: '{{contact.email}}' },
        position_x: 2360, position_y: 60,
      },
      {
        tempId: 'book-meeting',
        step_type: 'book_meeting' as PlaceholderStepType,
        step_config: { _name: 'Zaproponuj spotkanie 1:1', type: 'Konsultacja', duration: 30, calendar: 'AM Calendar' },
        position_x: 2690, position_y: 60,
      },
      {
        tempId: 'sms-reminder',
        step_type: 'send_sms' as PlaceholderStepType,
        step_config: { _name: 'SMS: Przypomnienie dostępu', to: '{{clientPhone}}', message: 'Hej! Twoje konto jest gotowe: {{loginUrl}} Potrzebujesz pomocy? Odpisz!' },
        position_x: 2030, position_y: 380,
      },
      {
        tempId: 'update-crm',
        step_type: 'update_crm' as PlaceholderStepType,
        step_config: { _name: 'CRM: Eskalacja do AM', crm: 'Pipedrive', field: 'note', value: 'Klient nieaktywny po 24h — wymaga kontaktu AM' },
        position_x: 2360, position_y: 380,
      },
      {
        tempId: 'email-escalate',
        step_type: 'send_email' as StepType,
        step_config: { type: 'send_email', _name: 'Email: Informacja do AM', template_id: null, to_expression: '{{accountManager.email}}' },
        position_x: 2690, position_y: 380,
      },
    ],
    edges: [
      { source_temp_id: 'trigger-1',        target_temp_id: 'welcome-email',       condition_branch: null,    sort_order: 0 },
      { source_temp_id: 'welcome-email',     target_temp_id: 'create-tasks',        condition_branch: null,    sort_order: 1 },
      { source_temp_id: 'create-tasks',      target_temp_id: 'sms-kickoff',         condition_branch: null,    sort_order: 2 },
      { source_temp_id: 'sms-kickoff',       target_temp_id: 'delay-24h',           condition_branch: null,    sort_order: 3 },
      { source_temp_id: 'delay-24h',         target_temp_id: 'cond-active',         condition_branch: null,    sort_order: 4 },
      { source_temp_id: 'cond-active',       target_temp_id: 'ai-personalized',     condition_branch: 'true',  sort_order: 5 },
      { source_temp_id: 'cond-active',       target_temp_id: 'sms-reminder',        condition_branch: 'false', sort_order: 6 },
      { source_temp_id: 'ai-personalized',   target_temp_id: 'email-personalized',  condition_branch: null,    sort_order: 7 },
      { source_temp_id: 'email-personalized', target_temp_id: 'book-meeting',       condition_branch: null,    sort_order: 8 },
      { source_temp_id: 'sms-reminder',      target_temp_id: 'update-crm',          condition_branch: null,    sort_order: 9 },
      { source_temp_id: 'update-crm',        target_temp_id: 'email-escalate',      condition_branch: null,    sort_order: 10 },
    ],
  },
]
