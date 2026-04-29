import { describe, it, expect, vi } from 'vitest'

// validation.ts (transitively imported by validate-steps.ts) reads @/lib/messages
// at module scope. Mock with the keys actually referenced by the schemas we exercise.
vi.mock('@/lib/messages', () => ({
  messages: {
    validation: {
      expressionRequired: 'Wyrażenie jest wymagane',
      expressionMustReferenceVariable: 'Wyrażenie musi zawierać zmienną',
      recipientRequired: 'Adres odbiorcy jest wymagany',
      recipientInvalid: 'Nieprawidłowy odbiorca',
      emailTemplateRequired: 'Wybierz szablon email',
      durationRequired: 'Czas trwania jest wymagany',
      durationPositive: 'Czas trwania musi być dodatni',
      durationInteger: 'Czas trwania musi być liczbą całkowitą',
      webhookUrlInvalid: 'Nieprawidłowy URL webhooka',
      webhookUrlRequired: 'URL webhooka jest wymagany',
      webhookMethodRequired: 'Metoda HTTP jest wymagana',
      promptRequired: 'Prompt jest wymagany',
      outputSchemaRequired: 'Output schema jest wymagany',
      outputFieldKeyRequired: 'Klucz pola jest wymagany',
      outputFieldLabelRequired: 'Etykieta pola jest wymagana',
      sourceExpressionRequired: 'Wyrażenie źródłowe jest wymagane',
      fieldMappingRequired: 'Mapowanie pól jest wymagane',
      workflowNameRequired: 'Nazwa workflow jest wymagana',
      workflowNameMax: 'Nazwa workflow jest za długa',
      stepTypeRequired: 'Typ kroku jest wymagany',
      sourceStepRequired: 'Krok źródłowy jest wymagany',
      targetStepRequired: 'Krok docelowy jest wymagany',
    },
  },
}))

import { validateAllSteps } from '../utils/validate-steps'

const VALID_TEMPLATE_ID = '11111111-1111-1111-1111-111111111111'

function step(id: string, step_type: string, step_config: Record<string, unknown>) {
  return { id, step_type, step_config }
}

describe('validateAllSteps', () => {
  // -----------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------

  it('returns isValid: true with empty errors when all steps are valid', () => {
    const result = validateAllSteps([
      step('s1', 'send_email', {
        template_id: VALID_TEMPLATE_ID,
        to_expression: 'client@example.com',
      }),
      step('s2', 'delay', { value: 5, unit: 'minutes' }),
      step('s3', 'survey_submitted', { survey_id: null }),
    ])

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.errorsByStepId.size).toBe(0)
  })

  it('returns isValid: true for an empty step list', () => {
    const result = validateAllSteps([])
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  // -----------------------------------------------------------------
  // Single invalid step
  // -----------------------------------------------------------------

  it('flags send_email missing template_id', () => {
    const result = validateAllSteps([
      step('email-1', 'send_email', { to_expression: 'client@example.com' }),
    ])

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].stepId).toBe('email-1')
    expect(result.errors[0].stepType).toBe('send_email')
    expect(result.errors[0].issues.length).toBeGreaterThan(0)
    expect(result.errorsByStepId.get('email-1')).toBe(result.errors[0])
  })

  // -----------------------------------------------------------------
  // Multiple invalid steps
  // -----------------------------------------------------------------

  it('aggregates errors across multiple invalid steps', () => {
    const result = validateAllSteps([
      step('s1', 'send_email', {}), // missing template_id + to_expression
      step('s2', 'delay', { unit: 'minutes' }), // missing value
      step('s3', 'webhook', { method: 'POST' }), // missing url
    ])

    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(3)
    expect(result.errorsByStepId.size).toBe(3)
    expect(result.errorsByStepId.has('s1')).toBe(true)
    expect(result.errorsByStepId.has('s2')).toBe(true)
    expect(result.errorsByStepId.has('s3')).toBe(true)
  })

  // -----------------------------------------------------------------
  // Switch — bracket-required + default exemption
  // -----------------------------------------------------------------

  it('rejects switch branch with bare-name expression (no brackets)', () => {
    const result = validateAllSteps([
      step('sw-1', 'switch', {
        branches: [
          { id: 'a', label: 'A', expression: 'overallScore' }, // bare name — must use {{...}}
          { id: 'default', label: 'Default', expression: 'default' },
        ],
      }),
    ])

    expect(result.isValid).toBe(false)
    const err = result.errorsByStepId.get('sw-1')
    expect(err).toBeDefined()
    const messages = err!.issues.map((i) => i.message).join(' | ')
    expect(messages.toLowerCase()).toContain('zmienn')
  })

  it('passes switch with default branch (default expression is exempt from bracket rule)', () => {
    const result = validateAllSteps([
      step('sw-2', 'switch', {
        branches: [
          { id: 'a', label: 'A', expression: '{{overallScore}}' },
          { id: 'default', label: 'Default', expression: 'default' },
        ],
      }),
    ])

    expect(result.isValid).toBe(true)
  })

  // -----------------------------------------------------------------
  // send_email recipient: literal, variable, bare text
  // -----------------------------------------------------------------

  it('passes send_email with literal email in to_expression', () => {
    const result = validateAllSteps([
      step('e-lit', 'send_email', {
        template_id: VALID_TEMPLATE_ID,
        to_expression: 'client@example.com',
      }),
    ])
    expect(result.isValid).toBe(true)
  })

  it('passes send_email with bracketed variable in to_expression', () => {
    const result = validateAllSteps([
      step('e-var', 'send_email', {
        template_id: VALID_TEMPLATE_ID,
        to_expression: '{{contact.email}}',
      }),
    ])
    expect(result.isValid).toBe(true)
  })

  it('rejects send_email with bare text (not email, no brackets)', () => {
    const result = validateAllSteps([
      step('e-bad', 'send_email', {
        template_id: VALID_TEMPLATE_ID,
        to_expression: 'definitely-not-an-email',
      }),
    ])
    expect(result.isValid).toBe(false)
    expect(result.errorsByStepId.get('e-bad')).toBeDefined()
  })

  // -----------------------------------------------------------------
  // Skipping: placeholder + unknown step types
  // -----------------------------------------------------------------

  it('skips placeholder step types silently (PLACEHOLDER_REGISTRY)', () => {
    const result = validateAllSteps([
      step('ph-1', 'whatsapp_message', { phone: '+48...' }),
    ])
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('skips unknown step types silently (canvas draft state tolerance)', () => {
    const result = validateAllSteps([
      step('unk-1', 'completely_made_up_step_type', { foo: 'bar' }),
    ])
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  // -----------------------------------------------------------------
  // summary format with multi-issue count
  // -----------------------------------------------------------------

  it('summary appends count when step has multiple issues', () => {
    const result = validateAllSteps([
      step('multi', 'send_email', {}), // missing template_id AND to_expression
    ])

    expect(result.isValid).toBe(false)
    const err = result.errorsByStepId.get('multi')!
    expect(err.issues.length).toBeGreaterThanOrEqual(2)
    expect(err.summary).toMatch(/\(\+\d+ more\)$/)
  })

  it('summary is the single message when only one issue exists', () => {
    const result = validateAllSteps([
      step('one', 'send_email', {
        // template_id valid, to_expression missing → single issue
        template_id: VALID_TEMPLATE_ID,
      }),
    ])

    expect(result.isValid).toBe(false)
    const err = result.errorsByStepId.get('one')!
    expect(err.summary).not.toMatch(/\(\+\d+ more\)$/)
    expect(err.summary).toBe(err.issues[0].message)
  })
})
