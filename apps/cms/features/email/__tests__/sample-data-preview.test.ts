/**
 * Tests for the sample-data preview toggle (council 2026-07-14):
 * only CODE-KNOWN tokens are filled; workflow/unresolvable/custom tokens stay
 * BRACKETED (the honest "won't be filled" signal must survive — never fabricate).
 */
import { describe, it, expect } from 'vitest'
import { messages } from '@/lib/messages'
import type { HeaderBlock, TextBlock } from '../types'
import { buildSampleValues } from '../utils/sample-values'
import { substituteBlockSampleTokens } from '../utils/substitute-block-tokens'

describe('buildSampleValues', () => {
  it('fills app scalars + the structural marker for an APP-OWNED type', () => {
    const values = buildSampleValues('venture_bonus')
    // app scalar
    expect(values.companyName).toBe(messages.email.sampleCompanyName)
    // structural marker
    expect(values.bonus_list).toBe(messages.email.sampleBonusList)
  })

  it('returns {} for a non-app-owned (workflow/custom) type — nothing code-known', () => {
    expect(buildSampleValues('form_confirmation')).toEqual({})
    expect(buildSampleValues('some_custom_slug')).toEqual({})
  })
})

describe('substituteBlockSampleTokens', () => {
  const values = buildSampleValues('venture_bonus')

  it('fills app token in a header block, leaves a workflow token bracketed', () => {
    const block: HeaderBlock = {
      id: 'h1',
      type: 'header',
      companyName: '{{companyName}} — {{surveyTitle}}',
      textColor: '#000000',
    }
    const out = substituteBlockSampleTokens(block, values) as HeaderBlock
    expect(out.companyName).toBe(`${messages.email.sampleCompanyName} — {{surveyTitle}}`)
    // id preserved so canvas selection/editing keep working
    expect(out.id).toBe('h1')
  })

  it('fills the structural marker + an app token in text HTML, brackets the unknown', () => {
    const block: TextBlock = {
      id: 't1',
      type: 'text',
      content: '<p>{{companyName}}: {{bonus_list}} — {{mystery}}</p>',
    }
    const out = substituteBlockSampleTokens(block, values) as TextBlock
    expect(out.content).toContain(messages.email.sampleCompanyName)
    expect(out.content).toContain(messages.email.sampleBonusList)
    // an unknown token is never fabricated — stays literal
    expect(out.content).toContain('{{mystery}}')
  })

  it('leaves ALL tokens bracketed when no sample values apply (workflow type)', () => {
    const empty = buildSampleValues('form_confirmation')
    const block: TextBlock = {
      id: 't2',
      type: 'text',
      content: '<p>{{companyName}} {{firstName}}</p>',
    }
    const out = substituteBlockSampleTokens(block, empty) as TextBlock
    expect(out.content).toContain('{{companyName}}')
    expect(out.content).toContain('{{firstName}}')
  })
})
