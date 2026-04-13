import { describe, it, expect } from 'vitest'
import {
  STEP_REGISTRY,
  STEP_MAP,
  STEP_TYPE_LABEL_KEYS,
  STEP_OUTPUT_SCHEMAS,
  type StepType,
} from '../step-registry'

// Registry is pure data — no messages.ts, no React, no Zod.
// No mocks required.

describe('STEP_REGISTRY', () => {
  it('zawiera dokładnie 5 step types', () => {
    expect(STEP_REGISTRY).toHaveLength(5)
  })

  it('zawiera wymagane 5 step type IDs', () => {
    const ids = STEP_REGISTRY.map((s) => s.id)
    expect(ids).toContain('send_email')
    expect(ids).toContain('ai_action')
    expect(ids).toContain('condition')
    expect(ids).toContain('delay')
    expect(ids).toContain('webhook')
  })

  it('każdy id jest unikalny', () => {
    const ids = STEP_REGISTRY.map((s) => s.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('każdy step ma wymagane pola: id, labelKey, icon, borderColor, category, outputSchema, defaultConfig', () => {
    const requiredFields = ['id', 'labelKey', 'icon', 'borderColor', 'category', 'outputSchema', 'defaultConfig'] as const
    for (const step of STEP_REGISTRY) {
      for (const field of requiredFields) {
        expect(step, `step ${step.id} brakuje pola ${field}`).toHaveProperty(field)
      }
    }
  })

  it('outputSchema każdego stepu jest tablicą; każde pole ma key, label, type', () => {
    for (const step of STEP_REGISTRY) {
      expect(Array.isArray(step.outputSchema), `${step.id}.outputSchema musi być tablicą`).toBe(true)
      for (const field of step.outputSchema) {
        expect(field, `${step.id} output field musi mieć key`).toHaveProperty('key')
        expect(field, `${step.id} output field musi mieć label`).toHaveProperty('label')
        expect(field, `${step.id} output field musi mieć type`).toHaveProperty('type')
        expect(typeof field.key, `${step.id}.key musi być stringiem`).toBe('string')
        expect(typeof field.label, `${step.id}.label musi być stringiem`).toBe('string')
        expect(['string', 'number', 'boolean', 'object']).toContain(field.type)
      }
    }
  })

  it('defaultConfig.type === id dla każdego step type', () => {
    for (const step of STEP_REGISTRY) {
      expect(step.defaultConfig.type).toBe(step.id)
    }
  })

  it('labelKey jest niepustym stringiem (klucz messages.workflows) dla każdego step type', () => {
    for (const step of STEP_REGISTRY) {
      expect(typeof step.labelKey).toBe('string')
      expect(step.labelKey.length).toBeGreaterThan(0)
    }
  })

  it('icon jest niepustym stringiem (key do Lucide mapping)', () => {
    for (const step of STEP_REGISTRY) {
      expect(typeof step.icon).toBe('string')
      expect(step.icon.length).toBeGreaterThan(0)
    }
  })

  it('category jest jedną z: actions, logic, ai', () => {
    const validCategories = ['actions', 'logic', 'ai']
    for (const step of STEP_REGISTRY) {
      expect(validCategories, `${step.id}.category musi być actions|logic|ai`).toContain(step.category)
    }
  })
})

describe('STEP_MAP', () => {
  it('STEP_MAP["send_email"].id === "send_email"', () => {
    expect(STEP_MAP['send_email'].id).toBe('send_email')
  })

  it('lookup działa dla każdego step type w registry', () => {
    for (const step of STEP_REGISTRY) {
      const found = STEP_MAP[step.id as StepType]
      expect(found).toBeDefined()
      expect(found.id).toBe(step.id)
    }
  })
})

describe('STEP_TYPE_LABEL_KEYS (derived z registry)', () => {
  it('STEP_TYPE_LABEL_KEYS jest Record<StepType, string>', () => {
    for (const step of STEP_REGISTRY) {
      const key = STEP_TYPE_LABEL_KEYS[step.id as StepType]
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
    }
  })

  it('STEP_TYPE_LABEL_KEYS wartości zgadzają się z registry labelKey', () => {
    for (const step of STEP_REGISTRY) {
      expect(STEP_TYPE_LABEL_KEYS[step.id as StepType]).toBe(step.labelKey)
    }
  })

  it('STEP_TYPE_LABEL_KEYS zawiera klucze messages.workflows dla step types', () => {
    const expectedKeys: Record<StepType, string> = {
      send_email: 'stepSendEmail',
      ai_action: 'stepAiAction',
      condition: 'stepCondition',
      delay: 'stepDelay',
      webhook: 'stepWebhook',
    }
    for (const [stepType, expectedKey] of Object.entries(expectedKeys)) {
      expect(STEP_TYPE_LABEL_KEYS[stepType as StepType]).toBe(expectedKey)
    }
  })
})

describe('STEP_OUTPUT_SCHEMAS (derived z registry)', () => {
  it('STEP_OUTPUT_SCHEMAS jest Record<StepType, OutputSchemaField[]>', () => {
    for (const step of STEP_REGISTRY) {
      const schema = STEP_OUTPUT_SCHEMAS[step.id as StepType]
      expect(Array.isArray(schema)).toBe(true)
    }
  })

  it('STEP_OUTPUT_SCHEMAS wartości zgadzają się z registry outputSchema', () => {
    for (const step of STEP_REGISTRY) {
      expect(STEP_OUTPUT_SCHEMAS[step.id as StepType]).toEqual(step.outputSchema)
    }
  })
})

describe('StepType (derived union)', () => {
  it('STEP_REGISTRY zawiera wszystkie StepType IDs (derived, nie hardcoded)', () => {
    // StepType jest wyprowadzony z STEP_REGISTRY — sprawdzamy że jest to spójne
    const ids = STEP_REGISTRY.map((s) => s.id)
    // Każdy element registry jest ważnym StepType (TypeScript enforces at compile time)
    // Runtime test: żaden id nie jest pustym stringiem
    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0)
    }
  })

  it('STEP_MAP klucze odpowiadają dokładnie IDs z STEP_REGISTRY', () => {
    const registryIds = new Set(STEP_REGISTRY.map((s) => s.id))
    const mapKeys = new Set(Object.keys(STEP_MAP))
    expect(mapKeys).toEqual(registryIds)
  })
})
