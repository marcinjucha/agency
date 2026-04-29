import { z, type ZodSchema } from 'zod'
import { messages } from '@/lib/messages'
import { STEP_REGISTRY, type StepType } from './step-registry'
import type { TriggerType } from './types'

const STEP_TYPE_ENUM = STEP_REGISTRY.map((s) => s.id) as [StepType, ...StepType[]]

// --- Variable expression helpers ---
// Matches at least one bracketed variable like {{step.field}} or {{name}}.
// Used by switch branch expressions, get_response, get_survey_link, and as the
// "variable form" recognizer for to_expression (recipient address).
const BRACKET_VARIABLE_REGEX = /\{\{[\w.]+\}\}/

const containsBracketedVariable = (value: string): boolean =>
  BRACKET_VARIABLE_REGEX.test(value)

// Expression that must reference at least one variable (e.g. {{step.field}}).
// Default branches in switch are exempt — they're recognized literally.
const expressionWithVariable = z
  .string()
  .min(1, messages.validation.expressionRequired)
  .refine(containsBracketedVariable, {
    message: messages.validation.expressionMustReferenceVariable,
  })

// Recipient: either a literal email OR a bracketed variable expression.
// WHY: variables resolve at runtime (e.g. {{contact.email}}); only literal
// values can be format-checked at form time.
const recipientExpression = z
  .string()
  .min(1, messages.validation.recipientRequired)
  .superRefine((value, ctx) => {
    if (containsBracketedVariable(value)) return
    if (!z.string().email().safeParse(value).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.validation.recipientInvalid,
      })
    }
  })

/** All canvas step types (step types + trigger types that appear as workflow_steps in the canvas) */
const TRIGGER_TYPES_FOR_CANVAS = [
  'survey_submitted',
  'booking_created',
  'lead_scored',
  'manual',
  'scheduled',
] as const satisfies TriggerType[]

const CANVAS_STEP_TYPE_ENUM = [
  ...STEP_TYPE_ENUM,
  ...TRIGGER_TYPES_FOR_CANVAS,
] as [StepType | TriggerType, ...(StepType | TriggerType)[]]

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
  template_id: z.string().uuid(messages.validation.emailTemplateRequired),
  to_expression: recipientExpression,
  variable_bindings: z.record(z.string()).optional(),
})

const switchBranchSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/i),
  label: z.string().min(1),
  // Per-branch refinement: every non-default branch must reference at least
  // one variable like {{step.field}}. The 'default' branch is the catch-all
  // and is exempt — recognized as the literal string 'default'.
  expression: z.string().min(1, messages.validation.expressionRequired),
})

export const switchConfigSchema = z.object({
  type: z.literal('switch'),
  branches: z.array(switchBranchSchema)
    .min(2)
    .superRefine((branches, ctx) => {
      const defaultCount = branches.filter(b => b.expression.trim() === 'default').length
      if (defaultCount !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.validation.switchRequiresOneDefault })
      }
      if (branches[branches.length - 1]?.expression.trim() !== 'default') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.validation.switchDefaultMustBeLast })
      }
      const ids = branches.map(b => b.id)
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.validation.switchBranchIdsMustBeUnique })
      }
      // Non-default branches must contain at least one bracketed variable.
      branches.forEach((branch, index) => {
        const expr = branch.expression.trim()
        if (expr === 'default') return
        if (!containsBracketedVariable(expr)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.validation.expressionMustReferenceVariable,
            path: [index, 'expression'],
          })
        }
      })
    }),
})

export const delayConfigSchema = z.object({
  type: z.literal('delay'),
  value: z
    .number({
      required_error: messages.validation.durationRequired,
    })
    .int(messages.validation.durationInteger)
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
  key: z.string().min(1, messages.validation.outputFieldKeyRequired),
  label: z.string().min(1, messages.validation.outputFieldLabelRequired),
  type: z.enum(['string', 'number', 'boolean', 'object']).default('string'),
})

export const aiActionConfigSchema = z.object({
  type: z.literal('ai_action'),
  prompt: z.string().min(1, messages.validation.promptRequired),
  model: z.string().nullable().optional(),
  // At least one output field is required so downstream steps have named
  // variables ({{stepName.fieldKey}}) to bind against.
  output_schema: z
    .array(outputSchemaFieldSchema)
    .min(1, messages.validation.outputSchemaRequired),
})

export const getResponseConfigSchema = z.object({
  type: z.literal('get_response'),
  responseIdExpression: expressionWithVariable,
})

export const updateResponseConfigSchema = z.object({
  type: z.literal('update_response'),
  field_mapping: z
    .array(
      z.object({
        target_column: z.enum(['ai_qualification', 'status', 'notes', 'respondent_name']),
        source_expression: z.string().min(1, messages.validation.sourceExpressionRequired),
      })
    )
    .min(1, messages.validation.fieldMappingRequired),
})

export const getSurveyLinkConfigSchema = z.object({
  type: z.literal('get_survey_link'),
  surveyLinkIdExpression: expressionWithVariable,
})

/**
 * Registry mapping step types to their config Zod schemas.
 * Adding a new step type = add schema above + entry here.
 *
 * Trigger types share triggerConfigSchema (discriminated internally).
 */
export const stepConfigSchemaMap: Record<StepType, ZodSchema> = {
  send_email: sendEmailConfigSchema,
  switch: switchConfigSchema,
  delay: delayConfigSchema,
  webhook: webhookConfigSchema,
  ai_action: aiActionConfigSchema,
  get_response: getResponseConfigSchema,
  update_response: updateResponseConfigSchema,
  get_survey_link: getSurveyLinkConfigSchema,
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
  step_type: z.enum(STEP_TYPE_ENUM, {
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
      step_type: z.enum(CANVAS_STEP_TYPE_ENUM),
      step_config: z.record(z.unknown()).optional().default({}),
      slug: z.string().optional(),
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
