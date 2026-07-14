import { describe, it, expect } from 'vitest'
import { updateEmailTemplateSchema } from '../validation'
import type { Block } from '../types'

// Iter 3 — walidacja nowych bloków (link / preview) + poziomu eyebrow.
// Lustrzane odbicie pokrycia templateOrUrl dla cta: URL musi być poprawnym
// http(s) LUB szablonem {{zmienna}}; śmieciowy string odpada.

function payload(blocks: Block[]) {
  return { subject: 'Temat', blocks }
}

describe('linkSchema (Iter 3)', () => {
  it('accepts a valid https URL', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([{ id: 'l1', type: 'link', label: 'Zobacz', url: 'https://example.com' }]),
    )
    expect(result.success).toBe(true)
  })

  it('accepts a {{variable}} template URL', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([{ id: 'l1', type: 'link', label: 'Zobacz', url: '{{responseUrl}}' }]),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a garbage URL', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([{ id: 'l1', type: 'link', label: 'Zobacz', url: 'nie-url ani zmienna' }]),
    )
    expect(result.success).toBe(false)
  })

  it('rejects an empty label', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([{ id: 'l1', type: 'link', label: '', url: 'https://example.com' }]),
    )
    expect(result.success).toBe(false)
  })

  it('link is allowed inside columns (nonColumnsBlockSchema) and section children', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([
        {
          id: 's1',
          type: 'section',
          children: [{ id: 'l1', type: 'link', label: 'W sekcji', url: 'https://example.com' }],
        },
        {
          id: 'c1',
          type: 'columns',
          gap: 'md',
          verticalAlign: 'top',
          leftChildren: [{ id: 'l2', type: 'link', label: 'W kolumnie', url: '{{url}}' }],
          rightChildren: [],
        },
      ]),
    )
    expect(result.success).toBe(true)
  })
})

describe('previewSchema (Iter 3)', () => {
  it('accepts a preview block (top-level and nested)', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([
        { id: 'p1', type: 'preview', text: 'Snippet skrzynki' },
        {
          id: 's1',
          type: 'section',
          children: [{ id: 'p2', type: 'preview', text: '' }],
        },
      ]),
    )
    expect(result.success).toBe(true)
  })

  it('rejects preview text over 300 chars', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([{ id: 'p1', type: 'preview', text: 'x'.repeat(301) }]),
    )
    expect(result.success).toBe(false)
  })
})

describe('heading level eyebrow (Iter 3)', () => {
  it('accepts level=eyebrow', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([{ id: 'h1', type: 'heading', text: 'TWOJE MATERIAŁY', level: 'eyebrow', color: '#1a1a2e' }]),
    )
    expect(result.success).toBe(true)
  })

  it('still rejects an unknown level', () => {
    const result = updateEmailTemplateSchema.safeParse(
      payload([
        { id: 'h1', type: 'heading', text: 'X', level: 'h4', color: '#1a1a2e' } as unknown as Block,
      ]),
    )
    expect(result.success).toBe(false)
  })
})
