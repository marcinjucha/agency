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

// --- Output Schema Field Type ---

export type OutputSchemaField = {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'object'
}

// --- Step Definition Factory ---

export type StepDefinition<TId extends string> = {
  id: TId
  label: string
  /** Lucide icon key — consumer maps string to LucideIcon component */
  icon: string
  borderColor: string
  category: 'actions' | 'logic' | 'ai'
  description: string
  outputSchema: OutputSchemaField[]
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
  label: 'Wyślij email',
  icon: 'Mail',
  borderColor: 'border-l-4 border-l-blue-400',
  category: 'actions',
  description: 'Wyślij wiadomość email',
  outputSchema: [
    { key: 'emailSent', label: 'Email wysłany', type: 'boolean' },
    { key: 'recipientEmail', label: 'Email odbiorcy', type: 'string' },
  ],
  defaultConfig: { type: 'send_email', template_id: null, to_expression: null },
})

const AI_ACTION_STEP = defineStep({
  id: 'ai_action' as const,
  label: 'Akcja AI',
  icon: 'Sparkles',
  borderColor: 'border-l-4 border-l-blue-400',
  category: 'ai',
  description: 'Przetwórz dane za pomocą AI',
  outputSchema: [
    { key: 'aiResponse', label: 'Odpowiedź AI', type: 'string' },
    { key: 'overallScore', label: 'Wynik ogólny', type: 'number' },
    { key: 'recommendation', label: 'Rekomendacja', type: 'string' },
  ],
  defaultConfig: { type: 'ai_action', prompt: '', model: null, output_schema: null },
})

const CONDITION_STEP = defineStep({
  id: 'condition' as const,
  label: 'Warunek',
  icon: 'GitBranch',
  borderColor: 'border-l-4 border-l-amber-400',
  category: 'logic',
  description: 'Rozgałęzienie na podstawie warunku',
  outputSchema: [
    { key: 'branch', label: 'Wynik warunku', type: 'string' },
  ],
  defaultConfig: { type: 'condition', expression: '' },
})

const DELAY_STEP = defineStep({
  id: 'delay' as const,
  label: 'Opóźnienie',
  icon: 'Clock',
  borderColor: 'border-l-4 border-l-muted-foreground',
  category: 'logic',
  description: 'Poczekaj określony czas',
  outputSchema: [],
  defaultConfig: { type: 'delay', value: 1, unit: 'minutes' },
})

const WEBHOOK_STEP = defineStep({
  id: 'webhook' as const,
  label: 'Webhook',
  icon: 'Globe',
  borderColor: 'border-l-4 border-l-blue-400',
  category: 'actions',
  description: 'Wywołaj zewnętrzny endpoint',
  outputSchema: [
    { key: 'statusCode', label: 'Kod statusu HTTP', type: 'number' },
    { key: 'responseBody', label: 'Odpowiedź webhook', type: 'string' },
  ],
  defaultConfig: { type: 'webhook', url: '', method: 'POST' },
})

// --- Registry ---

export const STEP_REGISTRY = [
  SEND_EMAIL_STEP,
  AI_ACTION_STEP,
  CONDITION_STEP,
  DELAY_STEP,
  WEBHOOK_STEP,
] as const

// --- Derived Types ---

/** Derived union type — NIE hardcoded string union. Aktualizuje się automatycznie przy dodaniu nowego step type. */
export type StepType = (typeof STEP_REGISTRY)[number]['id']

/** Lookup map — O(1) dostęp do step definition po id */
export const STEP_MAP = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s])
) as Record<StepType, (typeof STEP_REGISTRY)[number]>

// --- Derived Records (backward compatibility z istniejącymi konsumentami) ---

/** Derived labels — zastępuje STEP_TYPE_LABELS w types.ts i engine/utils.ts w iter 2-3 */
export const STEP_TYPE_LABELS: Record<StepType, string> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s.label])
) as Record<StepType, string>

/** Derived output schemas — zastępuje STEP_OUTPUT_SCHEMAS w types.ts i engine/utils.ts w iter 2-3 */
export const STEP_OUTPUT_SCHEMAS: Record<StepType, OutputSchemaField[]> = Object.fromEntries(
  STEP_REGISTRY.map((s) => [s.id, s.outputSchema])
) as Record<StepType, OutputSchemaField[]>
