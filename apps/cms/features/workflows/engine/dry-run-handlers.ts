import type { StepHandlerRegistry, ActionResult } from './types'
import type { WorkflowStep, StepType, OutputSchemaField } from '../types'
import { STEP_OUTPUT_SCHEMAS } from '../types'

// --- Dry-run mock handlers ---

/** Returns a mock value for a given field type and label */
export function getMockValue(type: string, label: string): unknown {
  switch (type) {
    case 'string': return `[mock] ${label}`
    case 'number': return 0
    case 'boolean': return true
    case 'object': return {}
    default: return `[mock] ${label}`
  }
}

/**
 * Generates mock output based on STEP_OUTPUT_SCHEMAS for a given step type.
 * For ai_action steps with custom output_schema in config, REPLACES defaults entirely.
 */
export function generateMockOutput(step: WorkflowStep): Record<string, unknown> {
  const stepType = step.step_type as StepType
  const config = step.step_config as Record<string, unknown>

  // For ai_action with custom output_schema, use ONLY custom fields (replace defaults)
  if (stepType === 'ai_action' && Array.isArray(config.output_schema)) {
    const mockOutput: Record<string, unknown> = {}
    for (const field of config.output_schema as Array<{ key: string; label: string; type: string }>) {
      mockOutput[field.key] = getMockValue(field.type, field.label)
    }
    return mockOutput
  }

  // Default: use STEP_OUTPUT_SCHEMAS
  const outputSchema: OutputSchemaField[] = STEP_OUTPUT_SCHEMAS[stepType] ?? []
  const mockOutput: Record<string, unknown> = {}
  for (const field of outputSchema) {
    mockOutput[field.key] = getMockValue(field.type, field.label)
  }
  return mockOutput
}

const mockHandler: StepHandlerRegistry[string] = async (step) => {
  return { success: true, outputPayload: generateMockOutput(step) }
}

/** Handler registry for dry-run mode -- returns mock success for all step types */
export const dryRunHandlers: StepHandlerRegistry = {
  send_email: mockHandler,
  ai_action: mockHandler,
  delay: mockHandler,
  webhook: mockHandler,
}
