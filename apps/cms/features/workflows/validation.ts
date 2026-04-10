import { z, type ZodSchema } from 'zod'
import { messages } from '@/lib/messages'
import type { TriggerType, StepType } from './types'

// --- Per-step-type config schemas (for config panels) ---

// Trigger configs (discriminated by trigger subtype)
export const triggerConfigSurveySubmittedSchema = z.object({
  type: z.literal('survey_submitted'),
  survey_id: z.string().uuid().nullable().optional(),
})

export const triggerConfigBookingCreatedSchema = z.object({
  type: z.literal('booking_created'),
})

export const triggerConfigLeadScoredSchema = z.object({
  type: z.literal('lead_scored'),
  min_score: z
    .number()
    .positive()
    .nullable()
    .optional()
    .or(z.nan().transform(() => null)),
})

export const triggerConfigManualSchema = z.object({
  type: z.literal('manual'),
})

export const triggerConfigScheduledSchema = z.object({
  type: z.literal('scheduled'),
})

export const triggerConfigSchema = z.discriminatedUnion('type', [
  triggerConfigSurveySubmittedSchema,
  triggerConfigBookingCreatedSchema,
  triggerConfigLeadScoredSchema,
  triggerConfigManualSchema,
  triggerConfigScheduledSchema,
])

// Step configs
export const sendEmailConfigSchema = z.object({
  type: z.literal('send_email'),
  template_id: z.string().uuid().nullable().optional(),
  to_expression: z.string().nullable().optional(),
})

export const conditionConfigSchema = z.object({
  type: z.literal('condition'),
  expression: z.string().min(1, messages.validation.expressionRequired),
})

export const delayConfigSchema = z.object({
  type: z.literal('delay'),
  value: z
    .number({
      required_error: messages.validation.durationRequired,
    })
    .positive(messages.validation.durationPositive)
    .or(z.nan().transform(() => undefined as unknown as number)),
  unit: z.enum(['minutes', 'hours', 'days']),
})

/**
 * DB-facing webhook config schema. Uses Record<string, string> for headers (flat JSON).
 * Note: WebhookConfigPanel has an internal webhookFormSchema that uses an array of
 * {key, value} pairs for useFieldArray compatibility, then converts to Record on output.
 */
export const webhookConfigSchema = z.object({
  type: z.literal('webhook'),
  url: z.string().url(messages.validation.webhookUrlInvalid).min(1, messages.validation.webhookUrlRequired),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], {
    required_error: messages.validation.webhookMethodRequired,
  }),
  headers: z.record(z.string(), z.string()).nullable().optional(),
  body: z.string().nullable().optional(),
})

export const outputSchemaFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'object']).default('string'),
})

export const aiActionConfigSchema = z.object({
  type: z.literal('ai_action'),
  prompt: z.string().min(1, messages.validation.promptRequired),
  model: z.string().nullable().optional(),
  output_schema: z.array(outputSchemaFieldSchema).nullable().optional(),
})

/**
 * Registry mapping step types to their config Zod schemas.
 * Adding a new step type = add schema above + entry here.
 *
 * Trigger types share triggerConfigSchema (discriminated internally).
 */
export const stepConfigSchemaMap: Record<StepType, ZodSchema> = {
  send_email: sendEmailConfigSchema,
  condition: conditionConfigSchema,
  delay: delayConfigSchema,
  webhook: webhookConfigSchema,
  ai_action: aiActionConfigSchema,
}

export const triggerConfigSchemaMap: Record<TriggerType, ZodSchema> = {
  survey_submitted: triggerConfigSurveySubmittedSchema,
  booking_created: triggerConfigBookingCreatedSchema,
  lead_scored: triggerConfigLeadScoredSchema,
  manual: triggerConfigManualSchema,
  scheduled: triggerConfigScheduledSchema,
}

// --- Workflow schemas ---

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, messages.validation.workflowNameRequired)
    .max(100, messages.validation.workflowNameMax),
  description: z.string().nullable().optional(),
  trigger_type: z.enum(['survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled']).optional().default('manual'),
  trigger_config: z.record(z.unknown()).optional().default({}),
  is_active: z.boolean().default(false),
})

export const updateWorkflowSchema = createWorkflowSchema.partial()

// --- Step schemas ---

export const createStepSchema = z.object({
  step_type: z.enum(['send_email', 'delay', 'condition', 'webhook', 'ai_action'], {
    required_error: messages.validation.stepTypeRequired,
  }),
  step_config: z.record(z.unknown()).optional().default({}),
  position_x: z
    .number()
    .default(0)
    .or(z.nan().transform(() => 0)),
  position_y: z
    .number()
    .default(0)
    .or(z.nan().transform(() => 0)),
})

export const updateStepSchema = createStepSchema.partial()

// --- Edge schemas ---

export const createEdgeSchema = z.object({
  source_step_id: z.string().uuid(messages.validation.sourceStepRequired),
  target_step_id: z.string().uuid(messages.validation.targetStepRequired),
  condition_branch: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
})

// --- Canvas bulk save schema (visual editor) ---

export const saveCanvasSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string().uuid().optional(),
      step_type: z.enum([
        'send_email', 'delay', 'condition', 'webhook', 'ai_action',
        'survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled',
      ]),
      step_config: z.record(z.unknown()).optional().default({}),
      position_x: z
        .number()
        .default(0)
        .or(z.nan().transform(() => 0)),
      position_y: z
        .number()
        .default(0)
        .or(z.nan().transform(() => 0)),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string().uuid().optional(),
      source_step_id: z.string().uuid(),
      target_step_id: z.string().uuid(),
      condition_branch: z.string().nullable().optional(),
      sort_order: z.number().int().default(0),
    })
  ),
})

// --- Template schema ---

export const createWorkflowFromTemplateSchema = z.object({
  templateId: z.string().min(1),
})

// --- Inferred types ---

export type CreateWorkflowFormData = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowFormData = z.infer<typeof updateWorkflowSchema>
export type CreateStepFormData = z.infer<typeof createStepSchema>
export type UpdateStepFormData = z.infer<typeof updateStepSchema>
export type CreateEdgeFormData = z.infer<typeof createEdgeSchema>
export type SaveCanvasFormData = z.infer<typeof saveCanvasSchema>
export type CreateWorkflowFromTemplateFormData = z.infer<typeof createWorkflowFromTemplateSchema>
