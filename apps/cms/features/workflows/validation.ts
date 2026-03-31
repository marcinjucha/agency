import { z } from 'zod'
import { messages } from '@/lib/messages'

// --- Workflow schemas ---

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, messages.validation.workflowNameRequired)
    .max(100, messages.validation.workflowNameMax),
  description: z.string().nullable().optional(),
  trigger_type: z.enum(['survey_submitted', 'booking_created', 'lead_scored', 'manual'], {
    required_error: messages.validation.triggerTypeRequired,
  }),
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
      step_type: z.enum(['send_email', 'delay', 'condition', 'webhook', 'ai_action']),
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

// --- Inferred types ---

export type CreateWorkflowFormData = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowFormData = z.infer<typeof updateWorkflowSchema>
export type CreateStepFormData = z.infer<typeof createStepSchema>
export type UpdateStepFormData = z.infer<typeof updateStepSchema>
export type CreateEdgeFormData = z.infer<typeof createEdgeSchema>
export type SaveCanvasFormData = z.infer<typeof saveCanvasSchema>
