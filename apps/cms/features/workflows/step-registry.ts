/**
 * Step Registry — single source of truth dla step types w Workflow Engine.
 *
 * CONSTRAINTS:
 * - Brak importu messages.ts (łamie vitest — circular deps przez @/lib/messages)
 * - Brak importu React components — icon jako string key (consumer robi Lucide mapping)
 * - Brak importu Zod — validation schemas zostają w validation.ts
 * - StepConfig discriminated union zostaje w types.ts
 *
 * WHY: 14 rejestrów step types w 14 plikach powoduje, że nowy step type = 14 edycji.
 * step-registry.ts centralizuje DANE (labels, icons, colors, schemas, defaultConfigs).
 * Iter 2-4 zmigrują istniejące rejestry żeby importować stąd zamiast duplikować.
 */

// --- Output Schema Field Types ---

/**
 * OutputSchemaDefinition — used in step-registry.ts (static definitions).
 * labelKey references messages.workflows.stepOutput.* for Polish resolution via bridge.
 * Registry stays zero-dependency: no messages.ts import here.
 */
export type OutputSchemaDefinition = {
  key: string
  /** Key into messages.workflows.stepOutput — e.g. 'emailSent'. Resolved to Polish via utils/step-labels.ts bridge. */
  labelKey: string
  type: 'string' | 'number' | 'boolean' | 'object'
}

/**
 * OutputSchemaField — used for runtime/DB data (user-defined ai_action output schemas).
 * label is a resolved string (user-entered or resolved from registry).
 * Must keep label: string because it's stored in DB and entered by users in AiActionConfigPanel.
 */
export type OutputSchemaField = {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'object'
}

// --- Step Definition Factory ---

export type StepDefinition<TId extends string> = {
  id: TId
  /**
   * Key into messages.workflows — e.g. 'stepSendEmail'.
   * Consumers resolve via messages.workflows[labelKey] or utils/step-labels.ts.
   * Registry stays zero-dependency (no messages.ts import).
   */
  labelKey: string
  /**
   * Key into messages.workflows.stepLibrary — e.g. 'descSendEmail'.
   * Consumers resolve via messages.workflows.stepLibrary[descriptionKey] or utils/step-labels.ts.
   * Registry stays zero-dependency (no messages.ts import).
   */
  descriptionKey: string
  borderColor: string
  category: 'actions' | 'logic' | 'ai'
  outputSchema: OutputSchemaDefinition[]
  defaultConfig: { type: TId } & Record<string, unknown>
}

/**
 * defineStep — plain object factory (NIE klasa).
 * Tree-shaking friendly, brak circular dep issues w Next.js.
 */
export function defineStep<TId extends string>(
  def: StepDefinition<TId>
): StepDefinition<TId> {
  return def
}

// --- Step Definitions ---

const SEND_EMAIL_STEP = defineStep({
  id: 'send_email' as const,
  labelKey: 'stepSendEmail',
  descriptionKey: 'descSendEmail',
  borderColor: 'border-l-4 border-l-blue-400',
  category: 'actions',
  outputSchema: [
    { key: 'emailSent', labelKey: 'emailSent', type: 'boolean' },
    { key: 'recipientEmail', labelKey: 'recipientEmail', type: 'string' },
  ],
  defaultConfig: { type: 'send_email', template_id: null, to_expression: null },
})

const AI_ACTION_STEP = defineStep({
  id: 'ai_action' as const,
  labelKey: 'stepAiAction',
  descriptionKey: 'descAiAction',
  borderColor: 'border-l-4 border-l-blue-400',
  category: 'ai',
  outputSchema: [
    { key: 'aiResponse', labelKey: 'aiResponse', type: 'string' },
    { key: 'overallScore', labelKey: 'overallScore', type: 'number' },
    { key: 'recommendation', labelKey: 'recommendation', type: 'string' },
    { key: 'aiOutputJson', labelKey: 'aiOutputJson', type: 'object' },
  ],
  defaultConfig: { type: 'ai_action', prompt: '', model: null, output_schema: null },
})

const CONDITION_STEP = defineStep({
  id: 'condition' as const,
  labelKey: 'stepCondition',
  descriptionKey: 'descCondition',
  borderColor: 'border-l-4 border-l-amber-400',
  category: 'logic',
  outputSchema: [
    { key: 'branch', labelKey: 'conditionBranch', type: 'string' },
  ],
  defaultConfig: { type: 'condition', expression: '' },
})

const DELAY_STEP = defineStep({
  id: 'delay' as const,
  labelKey: 'stepDelay',
  descriptionKey: 'descDelay',
  borderColor: 'border-l-4 border-l-muted-foreground',
  category: 'logic',
  outputSchema: [],
  defaultConfig: { type: 'delay', value: 1, unit: 'minutes' },
})

const WEBHOOK_STEP = defineStep({
  id: 'webhook' as const,
  labelKey: 'stepWebhook',
  descriptionKey: 'descWebhook',
  borderColor: 'border-l-4 border-l-blue-400',
  category: 'actions',
  outputSchema: [
    { key: 'statusCode', labelKey: 'httpStatusCode', type: 'number' },
    { key: 'responseBody', labelKey: 'webhookResponseBody', type: 'string' },
  ],
  defaultConfig: { type: 'webhook', url: '', method: 'POST' },
})

const GET_RESPONSE_STEP = defineStep({
  id: 'get_response' as const,
  labelKey: 'stepGetResponse',
  descriptionKey: 'descGetResponse',
  borderColor: 'border-l-4 border-l-emerald-400',
  category: 'actions',
  outputSchema: [
    { key: 'responseId',      labelKey: 'responseId',       type: 'string' },
    { key: 'status',          labelKey: 'responseStatus',    type: 'string' },
    { key: 'respondentName',  labelKey: 'respondentName',    type: 'string' },
    { key: 'createdAt',       labelKey: 'submittedAt',       type: 'string' },
    { key: 'surveyTitle',     labelKey: 'surveyTitle',       type: 'string' },
    { key: 'clientEmail',     labelKey: 'clientEmail',       type: 'string' },
    { key: 'answers',         labelKey: 'answers',           type: 'object' },
    { key: 'qaContext',       labelKey: 'qaContext',         type: 'string' },
    { key: 'companyName',     labelKey: 'companyName',       type: 'string' },
    { key: 'aiQualification', labelKey: 'aiQualification',  type: 'object' },
    { key: 'responseUrl',     labelKey: 'responseUrl',       type: 'string' },
  ],
  defaultConfig: { type: 'get_response', responseIdExpression: '{{responseId}}' },
})

const UPDATE_RESPONSE_STEP = defineStep({
  id: 'update_response' as const,
  labelKey: 'stepUpdateResponse',
  descriptionKey: 'descUpdateResponse',
  borderColor: 'border-l-4 border-l-emerald-400',
  category: 'actions',
  outputSchema: [
    { key: 'updated',   labelKey: 'updateSuccess', type: 'boolean' },
    { key: 'updatedAt', labelKey: 'updatedAt',     type: 'string' },
  ],
  defaultConfig: { type: 'update_response', field_mapping: [] },
})

const GET_SURVEY_LINK_STEP = defineStep({
  id: 'get_survey_link' as const,
  labelKey: 'stepGetSurveyLink',
  descriptionKey: 'descGetSurveyLink',
  borderColor: 'border-l-4 border-l-emerald-400',
  category: 'actions',
  outputSchema: [
    { key: 'notificationEmail', labelKey: 'outputNotificationEmail', type: 'string' },
    { key: 'token',             labelKey: 'outputSurveyLinkToken',   type: 'string' },
    { key: 'surveyTitle',       labelKey: 'outputSurveyTitle',       type: 'string' },
  ],
  defaultConfig: { type: 'get_survey_link', surveyLinkIdExpression: '{{surveyLinkId}}' },
})

// --- Registry ---

export const STEP_REGISTRY = [
  SEND_EMAIL_STEP,
  AI_ACTION_STEP,
  CONDITION_STEP,
  DELAY_STEP,
  WEBHOOK_STEP,
  GET_RESPONSE_STEP,
  UPDATE_RESPONSE_STEP,
  GET_SURVEY_LINK_STEP,
] as const

// --- Derived Types ---

/** Derived union type — NIE hardcoded string union. Aktualizuje się automatycznie przy dodaniu nowego step type. */
export type StepType = (typeof STEP_REGISTRY)[number]['id']

/** Lookup map — O(1) dostęp do step definition po id */
export const STEP_MAP = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s])
) as Record<StepType, (typeof STEP_REGISTRY)[number]>

// --- Placeholder Step Types (showcase-only, not executed) ---

export type PlaceholderFieldDefinition = {
  key: string
  label: string
  placeholder?: string
  type: 'text' | 'select' | 'number'
  options?: string[]
  readOnly?: boolean
}

export type PlaceholderStepDefinition = {
  id: string
  label: string
  description: string
  /** Lucide icon name (string — keeps registry zero-dep from Lucide) */
  iconName: string
  borderColor: string
  placeholderFields: PlaceholderFieldDefinition[]
}

export const PLACEHOLDER_REGISTRY: PlaceholderStepDefinition[] = [
  // Triggers
  {
    id: 'whatsapp_message',
    label: 'WhatsApp wiadomość',
    description: 'Uruchom gdy klient pisze na WhatsApp',
    iconName: 'MessageCircle',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'phone', label: 'Numer WhatsApp Business', placeholder: '+48...', type: 'text' },
      { key: 'webhook', label: 'Webhook URL', type: 'text', readOnly: true, placeholder: 'https://...' },
    ],
  },
  {
    id: 'sms_received',
    label: 'SMS przychodzący',
    description: 'Uruchom gdy klient wysyła SMS',
    iconName: 'Phone',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'phone', label: 'Numer Twilio', placeholder: '+48...', type: 'text' },
      { key: 'webhook', label: 'Webhook URL', type: 'text', readOnly: true, placeholder: 'https://...' },
    ],
  },
  {
    id: 'facebook_message',
    label: 'Facebook Messenger',
    description: 'Wiadomość na Facebooku',
    iconName: 'MessageSquare',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'page', label: 'Strona Facebook', placeholder: 'Halo Efekt', type: 'text' },
      { key: 'webhook', label: 'Webhook URL', type: 'text', readOnly: true, placeholder: 'https://...' },
    ],
  },
  {
    id: 'instagram_dm',
    label: 'Instagram DM',
    description: 'Wiadomość prywatna na Instagramie',
    iconName: 'Instagram',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'account', label: 'Konto Instagram', placeholder: '@haloefekt', type: 'text' },
      { key: 'webhook', label: 'Webhook URL', type: 'text', readOnly: true, placeholder: 'https://...' },
    ],
  },
  {
    id: 'calendar_event',
    label: 'Nadchodzące spotkanie',
    description: 'X minut przed spotkaniem w Google Calendar',
    iconName: 'Calendar',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'calendar', label: 'Kalendarz Google', placeholder: 'Główny kalendarz', type: 'text' },
      { key: 'minutesBefore', label: 'Ile minut wcześniej', placeholder: '60', type: 'number' },
    ],
  },
  {
    id: 'schedule',
    label: 'Harmonogram',
    description: 'Uruchamiaj codziennie / co tydzień / cron',
    iconName: 'Clock',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'frequency', label: 'Częstotliwość', type: 'select', options: ['Codziennie', 'Co tydzień', 'Miesięcznie', 'Własny CRON'] },
      { key: 'time', label: 'Godzina uruchomienia', placeholder: '07:00', type: 'text' },
    ],
  },
  {
    id: 'crm_status_change',
    label: 'Zmiana statusu CRM',
    description: 'Gdy lead zmienia status w CRM',
    iconName: 'RefreshCw',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'crm', label: 'System CRM', type: 'select', options: ['Pipedrive', 'HubSpot', 'Salesforce'] },
      { key: 'fromStatus', label: 'Status: z', placeholder: 'Lead', type: 'text' },
      { key: 'toStatus', label: 'Status: na', placeholder: 'Klient', type: 'text' },
    ],
  },
  {
    id: 'email_received',
    label: 'Odebrany email',
    description: 'Nowy email na skrzynce firmowej',
    iconName: 'Mail',
    borderColor: 'border-l-4 border-l-orange-500',
    placeholderFields: [
      { key: 'email', label: 'Konto email', placeholder: 'biuro@firma.pl', type: 'text' },
      { key: 'subjectFilter', label: 'Filtr tematu (opcjonalnie)', placeholder: 'Zapytanie ofertowe', type: 'text' },
    ],
  },
  // Communication actions
  {
    id: 'send_sms',
    label: 'Wyślij SMS',
    description: 'Wyślij wiadomość SMS do klienta',
    iconName: 'MessageCircle',
    borderColor: 'border-l-4 border-l-blue-400',
    placeholderFields: [
      { key: 'to', label: 'Numer telefonu', placeholder: '{{clientPhone}}', type: 'text' },
      { key: 'message', label: 'Treść wiadomości', placeholder: 'Witaj, dziękujemy za kontakt...', type: 'text' },
    ],
  },
  {
    id: 'send_whatsapp',
    label: 'Wyślij WhatsApp',
    description: 'Wyślij wiadomość na WhatsApp',
    iconName: 'Send',
    borderColor: 'border-l-4 border-l-blue-400',
    placeholderFields: [
      { key: 'to', label: 'Numer telefonu', placeholder: '{{clientPhone}}', type: 'text' },
      { key: 'template', label: 'Szablon wiadomości', placeholder: 'Potwierdzenie spotkania...', type: 'text' },
    ],
  },
  {
    id: 'send_slack',
    label: 'Powiadomienie Slack/Teams',
    description: 'Alert dla zespołu',
    iconName: 'Bell',
    borderColor: 'border-l-4 border-l-blue-400',
    placeholderFields: [
      { key: 'platform', label: 'Platforma', type: 'select', options: ['Slack', 'Microsoft Teams'] },
      { key: 'channel', label: 'Kanał/webhook', placeholder: '#sprzedaz', type: 'text' },
      { key: 'message', label: 'Treść', placeholder: 'Nowy gorący lead: {{clientName}}', type: 'text' },
    ],
  },
  // CRM & Calendar actions
  {
    id: 'update_crm',
    label: 'Aktualizuj CRM',
    description: 'Zapisz dane leada do systemu CRM',
    iconName: 'Database',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'crm', label: 'System CRM', type: 'select', options: ['Pipedrive', 'HubSpot', 'Salesforce'] },
      { key: 'action', label: 'Pola do zaktualizowania', placeholder: 'status = Gorący lead', type: 'text' },
    ],
  },
  {
    id: 'book_meeting',
    label: 'Umów spotkanie',
    description: 'Zarezerwuj termin w kalendarzu',
    iconName: 'CalendarCheck',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'calendar', label: 'Kalendarz', placeholder: 'Główny', type: 'text' },
      { key: 'duration', label: 'Czas trwania (min)', placeholder: '60', type: 'number' },
      { key: 'bookingLink', label: 'Link do rezerwacji', placeholder: 'https://cal.firma.pl/...', type: 'text' },
    ],
  },
  {
    id: 'create_task',
    label: 'Utwórz zadanie',
    description: 'Dodaj zadanie w CRM lub project managerze',
    iconName: 'CheckSquare',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'system', label: 'System', type: 'select', options: ['CRM', 'Asana', 'Trello', 'ClickUp'] },
      { key: 'title', label: 'Tytuł zadania', placeholder: 'Follow-up: {{clientName}}', type: 'text' },
      { key: 'assignTo', label: 'Przypisz do', placeholder: 'Jan Kowalski', type: 'text' },
    ],
  },
  // Data & Integrations actions
  {
    id: 'google_sheets',
    label: 'Google Sheets',
    description: 'Odczytaj lub zapisz dane w arkuszu',
    iconName: 'Table2',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'sheetId', label: 'ID Arkusza', placeholder: '1BxiMVs0XRA...', type: 'text' },
      { key: 'tab', label: 'Zakładka', placeholder: 'Leady', type: 'text' },
      { key: 'mode', label: 'Tryb', type: 'select', options: ['Odczyt', 'Zapis', 'Aktualizacja'] },
    ],
  },
  {
    id: 'web_scraper',
    label: 'Pobierz dane ze strony',
    description: 'Scraping strony internetowej klienta',
    iconName: 'Globe',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'url', label: 'URL strony', placeholder: '{{clientWebsite}}', type: 'text' },
      { key: 'selector', label: 'Co pobierać', placeholder: 'Opis firmy, produkty...', type: 'text' },
    ],
  },
  {
    id: 'linkedin_lookup',
    label: 'LinkedIn Lookup',
    description: 'Wyszukaj profil firmy lub osoby',
    iconName: 'Linkedin',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'query', label: 'Nazwa firmy/osoby', placeholder: '{{companyName}}', type: 'text' },
      { key: 'type', label: 'Typ', type: 'select', options: ['Firma', 'Osoba'] },
    ],
  },
  {
    id: 'get_crm_data',
    label: 'Pobierz dane z CRM',
    description: 'Pobierz historię klienta z CRM',
    iconName: 'Database',
    borderColor: 'border-l-4 border-l-emerald-400',
    placeholderFields: [
      { key: 'crm', label: 'System CRM', type: 'select', options: ['Pipedrive', 'HubSpot', 'Salesforce'] },
      { key: 'query', label: 'Co pobierać', type: 'select', options: ['Lead', 'Deal', 'Kontakt', 'Historia rozmów'] },
    ],
  },
  {
    id: 'email_sequence',
    label: 'Sekwencja emaili',
    description: 'Automatyczna seria emaili (drip)',
    iconName: 'ListOrdered',
    borderColor: 'border-l-4 border-l-blue-400',
    placeholderFields: [
      { key: 'name', label: 'Nazwa sekwencji', placeholder: 'Nurturing Cold', type: 'text' },
      { key: 'count', label: 'Liczba emaili', placeholder: '12', type: 'number' },
      { key: 'interval', label: 'Interwał (dni)', placeholder: '7', type: 'number' },
    ],
  },
]

export const PLACEHOLDER_STEP_MAP: Record<string, PlaceholderStepDefinition> = Object.fromEntries(
  PLACEHOLDER_REGISTRY.map((s) => [s.id, s])
)

// --- Derived Records ---

/**
 * Derived label keys — maps StepType → messages.workflows key (e.g. 'stepSendEmail').
 * Consumers resolve to Polish strings via messages.workflows[key] or utils/step-labels.ts.
 * Registry stays zero-dependency: no messages import here.
 */
export const STEP_TYPE_LABEL_KEYS: Record<StepType, string> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s.labelKey])
) as Record<StepType, string>

/**
 * Derived description keys — maps StepType → messages.workflows.stepLibrary key (e.g. 'descSendEmail').
 * Consumers resolve to Polish strings via messages.workflows.stepLibrary[key] or utils/step-labels.ts.
 * Registry stays zero-dependency: no messages import here.
 */
export const STEP_TYPE_DESCRIPTION_KEYS: Record<StepType, string> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s.descriptionKey])
) as Record<StepType, string>

/** Derived output schema definitions — single source of truth, re-eksportowane przez types.ts i engine/utils.ts.
 * Type uses OutputSchemaDefinition (labelKey) — resolve to OutputSchemaField (label) via utils/step-labels.ts bridge. */
export const STEP_OUTPUT_SCHEMAS: Record<StepType, OutputSchemaDefinition[]> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s.outputSchema])
) as Record<StepType, OutputSchemaDefinition[]>

// --- Output Schema Presets ---

/**
 * Pre-configured OutputSchemaField presets for step types that have common output shapes.
 * Uses OutputSchemaField (label: string) because preset fields are user-facing resolved strings.
 * WHY: ai_action prompts for AI qualification follow a known schema — presets let users pick instead of typing manually.
 */
export type OutputSchemaPreset = {
  id: string
  labelKey: string
  fields: OutputSchemaField[]
}

export const STEP_OUTPUT_SCHEMA_PRESETS: Partial<Record<StepType, OutputSchemaPreset[]>> = {
  ai_action: [
    {
      id: 'qualification_analysis',
      labelKey: 'presetQualificationAnalysis',
      fields: [
        { key: 'overallScore',       label: 'Overall Score',       type: 'number' },
        { key: 'urgencyScore',       label: 'Urgency Score',       type: 'number' },
        { key: 'complexityScore',    label: 'Complexity Score',    type: 'number' },
        { key: 'valueScore',         label: 'Value Score',         type: 'number' },
        { key: 'successProbability', label: 'Success Probability', type: 'number' },
        { key: 'summary',            label: 'Summary',             type: 'string' },
        { key: 'recommendation',     label: 'Recommendation',      type: 'string' },
        { key: 'aiResponse',         label: 'AI Response',         type: 'string' },
        { key: 'aiOutputJson',       label: 'Wynik AI (pełny JSON)', type: 'object' },
      ],
    },
  ],
  update_response: [
    {
      id: 'save_to_ai_qualification',
      labelKey: 'presetSaveAiQualification',
      fields: [],
    },
  ],
}
