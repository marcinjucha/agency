import { describe, it, expect } from 'vitest'
import { updateEmailTemplateSchema } from '../validation'
import { describeSaveError } from '../utils/describe-save-error'
import type { Block } from '../types'

// Mapowanie błędu zapisu (zod) → przyjazny komunikat + id bloku do zaznaczenia.
// Parsujemy REALNE payloady przez updateEmailTemplateSchema, żeby ścieżki błędów
// były autentyczne (nie ręcznie klecone) — pin przeciw dryfowi ścieżek zod.

function errorFor(blocks: Block[]) {
  const result = updateEmailTemplateSchema.safeParse({ subject: 'Temat', blocks })
  if (result.success) throw new Error('spodziewano się błędu walidacji')
  return result.error
}

describe('describeSaveError', () => {
  it('wskazuje top-level CTA bez URL — id + przyjazny komunikat', () => {
    const blocks = [
      { id: 'c1', type: 'cta', label: 'Zrób kopię', url: '', textColor: '#ffffff' },
    ] as unknown as Block[]
    const desc = describeSaveError(blocks, errorFor(blocks))
    expect(desc.blockId).toBe('c1')
    expect(desc.message).toContain('adres URL')
    expect(desc.message).toContain('Przycisk CTA')
  })

  it('wskazuje CTA ZAGNIEŻDŻONY w sekcji (realny przypadek usera) po id', () => {
    const blocks = [
      { id: 'intro', type: 'text', content: '<p>hej</p>' },
      {
        id: 'card', type: 'section', padding: 'md',
        children: [
          { id: 'h', type: 'heading', text: 'Karta', level: 'h3', color: '#1a1a2e' },
          { id: 't', type: 'text', content: '<p>opis</p>' },
          { id: 'cta-w-karcie', type: 'cta', label: 'Zrób kopię', url: '', textColor: '#ffffff' },
        ],
      },
    ] as unknown as Block[]
    const desc = describeSaveError(blocks, errorFor(blocks))
    expect(desc.blockId).toBe('cta-w-karcie')
    expect(desc.message).toContain('adres URL')
  })

  it('błąd tematu → blockId null, komunikat o temacie', () => {
    const result = updateEmailTemplateSchema.safeParse({ subject: '', blocks: [
      { id: 't', type: 'text', content: '<p>x</p>' } as unknown as Block,
    ] })
    if (result.success) throw new Error('spodziewano się błędu')
    const desc = describeSaveError([], result.error)
    expect(desc.blockId).toBeNull()
    expect(desc.message).toBe('Temat jest wymagany')
  })
})
