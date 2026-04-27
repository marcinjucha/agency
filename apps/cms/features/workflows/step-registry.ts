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
