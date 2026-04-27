import { describe, it, expect } from 'vitest'
import { generateStepSlug, isValidSlugFormat } from '../slug'

describe('generateStepSlug', () => {
  it('returns bare slug for first instance of a known step type', () => {
    expect(generateStepSlug('ai_action', [])).toBe('aiAction')
    expect(generateStepSlug('get_response', [])).toBe('getResponse')
    expect(generateStepSlug('send_email', [])).toBe('sendEmail')
    expect(generateStepSlug('condition', [])).toBe('condition')
  })

  it('returns numeric suffix starting at 2 for second instance', () => {
    expect(generateStepSlug('ai_action', ['aiAction'])).toBe('aiAction2')
  })

  it('returns next free numeric suffix for third instance', () => {
    expect(generateStepSlug('ai_action', ['aiAction', 'aiAction2'])).toBe('aiAction3')
  })

  it('fills gaps — picks lowest free numeric suffix', () => {
    expect(generateStepSlug('ai_action', ['aiAction', 'aiAction3'])).toBe('aiAction2')
  })

  it('falls back to camelCase conversion for unknown step types', () => {
    expect(generateStepSlug('custom_action_type', [])).toBe('customActionType')
    expect(generateStepSlug('foo_bar_baz', [])).toBe('fooBarBaz')
  })

  it('handles single-word unknown step type without underscores', () => {
    expect(generateStepSlug('custom', [])).toBe('custom')
  })

  it('does not collide with unrelated existing slugs', () => {
    expect(generateStepSlug('ai_action', ['sendEmail', 'condition'])).toBe('aiAction')
  })

  it('produces slugs that pass isValidSlugFormat', () => {
    expect(isValidSlugFormat(generateStepSlug('ai_action', []))).toBe(true)
    expect(isValidSlugFormat(generateStepSlug('ai_action', ['aiAction']))).toBe(true)
    expect(isValidSlugFormat(generateStepSlug('custom_unknown', []))).toBe(true)
  })
})

describe('isValidSlugFormat', () => {
  it('accepts valid camelCase slugs', () => {
    expect(isValidSlugFormat('aiAction')).toBe(true)
    expect(isValidSlugFormat('aiAction2')).toBe(true)
    expect(isValidSlugFormat('a')).toBe(true)
    expect(isValidSlugFormat('foo123Bar')).toBe(true)
  })

  it('rejects PascalCase (leading uppercase)', () => {
    expect(isValidSlugFormat('AiAction')).toBe(false)
    expect(isValidSlugFormat('SendEmail')).toBe(false)
  })

  it('rejects snake_case (underscores)', () => {
    expect(isValidSlugFormat('ai_action')).toBe(false)
    expect(isValidSlugFormat('send_email')).toBe(false)
  })

  it('rejects leading digit', () => {
    expect(isValidSlugFormat('1ai')).toBe(false)
    expect(isValidSlugFormat('2')).toBe(false)
  })

  it('rejects special characters', () => {
    expect(isValidSlugFormat('ai-action')).toBe(false)
    expect(isValidSlugFormat('ai.action')).toBe(false)
    expect(isValidSlugFormat('ai action')).toBe(false)
    expect(isValidSlugFormat('ai!')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidSlugFormat('')).toBe(false)
  })
})
