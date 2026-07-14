import { describe, it, expect } from 'vitest'
import {
  resolveVariableSource,
  collectUnresolvableTokens,
} from '../utils/resolve-variable-source'

// APP-OWNED type = venture_bonus (only CMS-sent template). n8n/trigger-aligned
// types come from lib/trigger-schemas (form_confirmation, survey_submitted, ...).

describe('resolveVariableSource', () => {
  describe('app-owned (venture_bonus)', () => {
    it('classifies an app-supplied scalar as "app"', () => {
      expect(resolveVariableSource('companyName', 'venture_bonus').kind).toBe('app')
    })

    it('classifies the bonus-list marker key as "structural"', () => {
      expect(resolveVariableSource('bonus_list', 'venture_bonus').kind).toBe('structural')
    })

    it('classifies any other token as "unresolvable"', () => {
      expect(resolveVariableSource('firstName', 'venture_bonus').kind).toBe('unresolvable')
    })
  })

  describe('n8n / trigger-aligned types', () => {
    it('classifies a schema-backed token as "workflow"', () => {
      expect(resolveVariableSource('clientName', 'form_confirmation').kind).toBe('workflow')
    })

    it('NEVER marks an n8n token unresolvable, even one absent from the schema', () => {
      expect(resolveVariableSource('somethingNotInSchema', 'form_confirmation').kind).toBe(
        'workflow',
      )
      expect(resolveVariableSource('anyKey', 'survey_submitted').kind).toBe('workflow')
    })
  })

  describe('custom / unknown slug', () => {
    it('classifies tokens as neutral "manual" (no warning)', () => {
      expect(resolveVariableSource('firstName', 'my_custom_blast').kind).toBe('manual')
    })
  })

  it('always returns a non-empty label', () => {
    expect(resolveVariableSource('companyName', 'venture_bonus').label.length).toBeGreaterThan(0)
    expect(resolveVariableSource('x', 'custom_slug').label.length).toBeGreaterThan(0)
  })
})

describe('collectUnresolvableTokens', () => {
  it('flags app-owned tokens that are neither app-supplied, marker, nor manual', () => {
    const result = collectUnresolvableTokens(
      ['companyName', 'firstName', 'bonus_list'],
      'venture_bonus',
      [],
    )
    expect(result).toEqual(['firstName'])
  })

  it('whitelists the bonus_list marker (never flagged)', () => {
    expect(collectUnresolvableTokens(['bonus_list'], 'venture_bonus', [])).toEqual([])
  })

  it('whitelists app-supplied keys', () => {
    expect(collectUnresolvableTokens(['companyName'], 'venture_bonus', [])).toEqual([])
  })

  it('whitelists operator-registered manual keys', () => {
    expect(
      collectUnresolvableTokens(['firstName'], 'venture_bonus', ['firstName']),
    ).toEqual([])
  })

  it('returns [] for n8n/trigger-aligned types (resolvability invisible to editor)', () => {
    expect(
      collectUnresolvableTokens(['anything', 'clientName'], 'form_confirmation', []),
    ).toEqual([])
  })

  it('returns [] for custom/unknown slugs (never cry wolf on user slugs)', () => {
    expect(collectUnresolvableTokens(['firstName', 'foo'], 'my_custom_blast', [])).toEqual([])
  })
})
