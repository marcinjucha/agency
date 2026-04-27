import { describe, it, expect, vi } from 'vitest'

// validation.ts imports @/lib/messages at module level for error messages on other schemas.
// Mock it so we don't need the full app context in this test file.
vi.mock('@/lib/messages', () => ({
  messages: {
    validation: {
      expressionRequired: 'Wyrażenie jest wymagane',
      durationRequired: 'Czas trwania jest wymagany',
      durationPositive: 'Czas trwania musi być dodatni',
      webhookUrlInvalid: 'Nieprawidłowy URL webhooka',
      webhookUrlRequired: 'URL webhooka jest wymagany',
      webhookMethodRequired: 'Metoda HTTP jest wymagana',
      promptRequired: 'Prompt jest wymagany',
      workflowNameRequired: 'Nazwa workflow jest wymagana',
      workflowNameMax: 'Nazwa workflow jest za długa',
      stepTypeRequired: 'Typ kroku jest wymagany',
      sourceStepRequired: 'Krok źródłowy jest wymagany',
      targetStepRequired: 'Krok docelowy jest wymagany',
    },
  },
}))

import {
  getResponseConfigSchema,
  updateResponseConfigSchema,
} from '../validation'

// =============================================================
// getResponseConfigSchema
// =============================================================

describe('getResponseConfigSchema', () => {
  it('parses valid get_response config', () => {
    const result = getResponseConfigSchema.safeParse({ type: 'get_response' })
    expect(result.success).toBe(true)
  })

  it('parses get_response config with extra fields (strip mode)', () => {
    // Zod strips unknown keys by default
    const result = getResponseConfigSchema.safeParse({ type: 'get_response', extra: 'ignored' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ type: 'get_response' })
    }
  })

  it('rejects wrong type literal', () => {
    const result = getResponseConfigSchema.safeParse({ type: 'send_email' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type field', () => {
    const result = getResponseConfigSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects null', () => {
    const result = getResponseConfigSchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it('rejects undefined', () => {
    const result = getResponseConfigSchema.safeParse(undefined)
    expect(result.success).toBe(false)
  })
})

// =============================================================
// updateResponseConfigSchema
// =============================================================

describe('updateResponseConfigSchema', () => {
  it('parses valid update_response config with single mapping', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [
        { target_column: 'ai_qualification', source_expression: '{{ai_action_1.overallScore}}' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('parses update_response config with multiple mappings', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [
        { target_column: 'ai_qualification', source_expression: '{{ai_action_1.qualification}}' },
        { target_column: 'status', source_expression: 'completed' },
        { target_column: 'notes', source_expression: '{{ai_action_1.summary}}' },
        { target_column: 'respondent_name', source_expression: '{{get_response_1.respondentName}}' },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.field_mapping).toHaveLength(4)
    }
  })

  it('parses update_response config with empty field_mapping array', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [],
    })
    expect(result.success).toBe(true)
  })

  it('all four valid target_column values parse correctly', () => {
    const validColumns = ['ai_qualification', 'status', 'notes', 'respondent_name'] as const
    for (const target_column of validColumns) {
      const result = updateResponseConfigSchema.safeParse({
        type: 'update_response',
        field_mapping: [{ target_column, source_expression: 'value' }],
      })
      expect(result.success, `target_column '${target_column}' should be valid`).toBe(true)
    }
  })

  it('rejects unknown target_column value', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [
        { target_column: 'unknown_column', source_expression: '{{ai_action_1.overallScore}}' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty source_expression (min 1 character)', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [
        { target_column: 'ai_qualification', source_expression: '' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing source_expression field', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [
        { target_column: 'ai_qualification' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing target_column field', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: [
        { source_expression: '{{ai_action_1.overallScore}}' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects wrong type literal', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'get_response',
      field_mapping: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing field_mapping key entirely', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
    })
    expect(result.success).toBe(false)
  })

  it('rejects null field_mapping', () => {
    const result = updateResponseConfigSchema.safeParse({
      type: 'update_response',
      field_mapping: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects null', () => {
    const result = updateResponseConfigSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})
