/**
 * Tests for `resolveTemplateVariableFields` — the pure resolver that turns a
 * template's declared variables (or, as a fallback, the {{tokens}} extracted from
 * its subject/blocks) into the flat list of USER-FILLABLE variable fields shown
 * below the campaign template picker (Iter 3b).
 *
 * What MUST be correct:
 *   - DECLARED-FIRST: when `templateVariables` is non-empty, those win (carry the
 *     user-edited label/description) and extraction is NOT consulted;
 *   - EXTRACTION FALLBACK: when there are no declared variables, scan subject +
 *     blocks for {{key}} tokens → fields with just `key`;
 *   - the structural `{{bonus_list}}` marker is NEVER a fillable field (it is
 *     replaced by a generated block at send, not a scalar the user types);
 *   - dedupe by key, preserving first-seen order.
 */
import { describe, it, expect } from 'vitest'
import type { Block } from '@agency/email'
import { VENTURE_BONUS_MARKER_KEY } from '@/lib/app-sent-variables'
import { resolveTemplateVariableFields } from '../utils/resolve-template-variables'
import type { TemplateVariable } from '../types'

function textBlock(content: string): Block {
  return { id: content, type: 'text', content } as unknown as Block
}

describe('resolveTemplateVariableFields', () => {
  it('DECLARED-FIRST: maps declared variables (key/label/description), ignoring extraction', () => {
    const declared: TemplateVariable[] = [
      { key: 'firstName', label: 'Imię', description: 'Imię odbiorcy', source: 'manual' },
      { key: 'companyName', label: 'Firma' },
    ]

    const fields = resolveTemplateVariableFields({
      templateVariables: declared,
      // A token present ONLY in the body must NOT appear — declared wins wholesale.
      subject: 'Cześć {{unlistedToken}}',
      blocks: [textBlock('Body {{anotherUnlisted}}')],
    })

    expect(fields).toEqual([
      { key: 'firstName', label: 'Imię', description: 'Imię odbiorcy' },
      { key: 'companyName', label: 'Firma', description: undefined },
    ])
  })

  it('EXTRACTION FALLBACK: extracts {{key}} from subject + blocks when no declared variables', () => {
    const fields = resolveTemplateVariableFields({
      templateVariables: [],
      subject: 'Witaj {{firstName}}',
      blocks: [textBlock('Twoja firma {{companyName}} dziękuje')],
    })

    expect(fields).toEqual([{ key: 'firstName' }, { key: 'companyName' }])
  })

  it('falls back to extraction when templateVariables is null / undefined', () => {
    const subject = 'Hej {{firstName}}'
    const blocks = [textBlock('{{firstName}} — zniżka')]

    const fromNull = resolveTemplateVariableFields({ templateVariables: null, subject, blocks })
    const fromUndefined = resolveTemplateVariableFields({
      templateVariables: undefined,
      subject,
      blocks,
    })

    expect(fromNull).toEqual([{ key: 'firstName' }])
    expect(fromUndefined).toEqual([{ key: 'firstName' }])
  })

  it('EXCLUDES the {{bonus_list}} structural marker from declared variables', () => {
    const declared: TemplateVariable[] = [
      { key: 'companyName', label: 'Firma' },
      { key: VENTURE_BONUS_MARKER_KEY, label: 'Lista bonusów' },
    ]

    const fields = resolveTemplateVariableFields({
      templateVariables: declared,
      subject: '',
      blocks: [],
    })

    expect(fields).toEqual([{ key: 'companyName', label: 'Firma', description: undefined }])
    expect(fields.some((f) => f.key === VENTURE_BONUS_MARKER_KEY)).toBe(false)
  })

  it('EXCLUDES the {{bonus_list}} marker from the extraction fallback too', () => {
    const fields = resolveTemplateVariableFields({
      templateVariables: [],
      subject: '',
      blocks: [textBlock(`{{companyName}} {{${VENTURE_BONUS_MARKER_KEY}}}`)],
    })

    expect(fields).toEqual([{ key: 'companyName' }])
  })

  it('dedupes by key, preserving first-seen order (declared)', () => {
    const declared: TemplateVariable[] = [
      { key: 'firstName', label: 'Imię (1)' },
      { key: 'companyName', label: 'Firma' },
      { key: 'firstName', label: 'Imię (2)' },
    ]

    const fields = resolveTemplateVariableFields({
      templateVariables: declared,
      subject: '',
      blocks: [],
    })

    expect(fields.map((f) => f.key)).toEqual(['firstName', 'companyName'])
    // First occurrence wins.
    expect(fields[0].label).toBe('Imię (1)')
  })

  it('returns an empty list when there are neither declared nor extracted variables', () => {
    expect(
      resolveTemplateVariableFields({ templateVariables: [], subject: 'Brak zmiennych', blocks: [] }),
    ).toEqual([])
  })
})
