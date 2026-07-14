import { describe, it, expect } from 'vitest'
import { extractTemplateVariableKeys } from '../utils/extract-variable-keys'
import type { Block } from '@agency/email'

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function textBlock(content: string): Block {
  return { id: 'test-id', type: 'text', content } as Block
}

function headerBlock(companyName: string): Block {
  return {
    id: 'test-id',
    type: 'header',
    companyName,
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
  } as Block
}

function ctaBlock(label: string, url = 'https://example.com'): Block {
  return {
    id: 'test-id',
    type: 'cta',
    label,
    url,
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff',
  } as Block
}

function footerBlock(text: string): Block {
  return { id: 'test-id', type: 'footer', text } as Block
}

function columnsBlock(leftText: string, rightText: string): Block {
  return {
    id: 'test-id',
    type: 'columns',
    leftChildren: [textBlock(leftText)],
    rightChildren: [textBlock(rightText)],
  } as unknown as Block
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('extractTemplateVariableKeys', () => {
  it('1. zwraca [] dla pustego subject i pustych bloków', () => {
    const result = extractTemplateVariableKeys('', [])
    expect(result).toEqual([])
  })

  it('2. wyciąga klucz z subject', () => {
    const result = extractTemplateVariableKeys('Witaj {{clientName}}!', [])
    expect(result).toEqual(['clientName'])
  })

  it('3. wyciąga klucz z TextBlock.content', () => {
    const result = extractTemplateVariableKeys('', [textBlock('Tytuł: {{surveyTitle}}')])
    expect(result).toEqual(['surveyTitle'])
  })

  it('4. wyciąga klucz z ColumnsBlock (zagnieżdżony w leftChildren)', () => {
    const result = extractTemplateVariableKeys('', [columnsBlock('{{nested}} wartość', '')])
    expect(result).toEqual(['nested'])
  })

  it('5. deduplikuje — ta sama zmienna w kilku miejscach zwraca jedną instancję', () => {
    const blocks: Block[] = [
      textBlock('{{clientName}} to {{clientName}}'),
      footerBlock('Pozdrawia {{clientName}}'),
    ]
    const result = extractTemplateVariableKeys('Drogi {{clientName}}', blocks)
    expect(result).toEqual(['clientName'])
  })

  it('5b. znajduje zmienne wewnątrz section.children (także sekcja-w-sekcji)', () => {
    const blocks: Block[] = [
      {
        id: 's1',
        type: 'section',
        children: [
          textBlock('Cześć {{firstName}}'),
          {
            id: 's2',
            type: 'section',
            children: [textBlock('Głęboko {{deepKey}}')],
          },
        ],
      },
    ]
    const result = extractTemplateVariableKeys('', blocks)
    expect(result).toContain('firstName')
    expect(result).toContain('deepKey')
  })

  it('6. zwraca [] gdy brak zmiennych', () => {
    const result = extractTemplateVariableKeys(
      'Zwykły temat bez zmiennych',
      [textBlock('Zwykły tekst.')]
    )
    expect(result).toEqual([])
  })

  it('7. mieszany — subject + kilka bloków z różnymi zmiennymi → unikalne klucze', () => {
    const blocks: Block[] = [
      headerBlock('{{companyName}} Sp. z o.o.'),
      textBlock('Dziękujemy za ankietę {{surveyTitle}}.'),
      ctaBlock('Przejdź do {{ctaLabel}}', 'https://{{domain}}.pl'),
      footerBlock('Wiadomość dla {{clientName}}'),
    ]
    const result = extractTemplateVariableKeys('Potwierdzenie: {{surveyTitle}}', blocks)

    expect(result).toHaveLength(5)
    expect(result).toContain('surveyTitle')
    expect(result).toContain('companyName')
    expect(result).toContain('ctaLabel')
    expect(result).toContain('domain')
    expect(result).toContain('clientName')
  })
})
