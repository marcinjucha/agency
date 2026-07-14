import { describe, it, expect } from 'vitest'
import {
  applySectionPatch,
  TYPOGRAPHY_SECTION_KEYS,
  BORDER_SECTION_KEYS,
} from '../utils/apply-section-patch'
import { updateEmailTemplateSchema } from '../validation'

/**
 * Pin-bug: sekcje Inspectora czyszczą wartości przez `delete merged[key]`
 * na lokalnym partialu — klucz usunięty z partiala NIE ISTNIEJE w patchu,
 * więc `{ ...block, ...patch }` zachowywał starą wartość z bloku
 * (nieusuwalny borderColorToken → "wieczna biała ramka" na info-boxie).
 */
describe('applySectionPatch', () => {
  describe('border section', () => {
    const block = {
      id: 'b1',
      type: 'text',
      content: '<p>Info box</p>',
      borderColorToken: 'primary',
      borderRadius: 'soft',
    }

    it('removes a token deleted from the section patch (pin-bug: clearColor)', () => {
      // clearColor('borderColor', 'borderColorToken') → patch bez OBU kluczy
      const patch = { borderRadius: 'soft' }

      const result = applySectionPatch(block, BORDER_SECTION_KEYS, patch)

      expect('borderColorToken' in result).toBe(false)
      expect('borderColor' in result).toBe(false)
      expect(result.borderRadius).toBe('soft')

      // Demonstracja starego bugu: zwykły spread zachowuje stale token.
      const oldSpreadBehavior = { ...block, ...patch }
      expect('borderColorToken' in oldSpreadBehavior).toBe(true)
    })

    it('clears BOTH raw hex and token (clearColor on a block with both histories)', () => {
      const withBoth = { ...block, backgroundColor: '#ffffff', backgroundColorToken: 'surface' }
      // clearColor('backgroundColor', 'backgroundColorToken') — patch zachowuje resztę sekcji
      const patch = { borderColorToken: 'primary', borderRadius: 'soft' }

      const result = applySectionPatch(withBoth, BORDER_SECTION_KEYS, patch)

      expect('backgroundColor' in result).toBe(false)
      expect('backgroundColorToken' in result).toBe(false)
      expect(result.borderColorToken).toBe('primary')
    })

    it('switches token → custom hex (setCustomColor deletes the token)', () => {
      const patch = { borderColor: '#ff0000', borderRadius: 'soft' }

      const result = applySectionPatch(block, BORDER_SECTION_KEYS, patch)

      expect(result.borderColor).toBe('#ff0000')
      expect('borderColorToken' in result).toBe(false)
    })

    it('switches custom hex → token (selectToken deletes the raw value)', () => {
      const withHex = { id: 'b2', type: 'text', content: 'x', borderColor: '#00ff00' }
      const patch = { borderColorToken: 'accent' }

      const result = applySectionPatch(withHex, BORDER_SECTION_KEYS, patch)

      expect(result.borderColorToken).toBe('accent')
      expect('borderColor' in result).toBe(false)
    })

    it('preserves non-section keys untouched (id, type, content)', () => {
      const result = applySectionPatch(block, BORDER_SECTION_KEYS, {})

      expect(result.id).toBe('b1')
      expect(result.type).toBe('text')
      expect(result.content).toBe('<p>Info box</p>')
    })

    it('applies values present in the patch', () => {
      const patch = { borderRadius: 'pill', backgroundColor: '#0f172a' }

      const result = applySectionPatch(block, BORDER_SECTION_KEYS, patch)

      expect(result.borderRadius).toBe('pill')
      expect(result.backgroundColor).toBe('#0f172a')
    })

    it('never sets a section key to undefined — keys are omitted entirely', () => {
      const patch = { borderColor: undefined, borderRadius: 'soft' }

      const result = applySectionPatch(block, BORDER_SECTION_KEYS, patch)

      expect('borderColor' in result).toBe(false)
      expect(Object.values(result)).not.toContain(undefined)
    })
  })

  describe('typography section', () => {
    it('clears textColor + textColorToken while preserving textAlign from the patch', () => {
      const block = {
        id: 't1',
        type: 'heading',
        text: 'Tytuł',
        level: 'h2',
        textAlign: 'center',
        textColor: '#334155',
        textColorToken: 'primary',
      }
      // clearColor w typografii → patch bez textColor/textColorToken, textAlign zostaje
      const patch = { textAlign: 'center' }

      const result = applySectionPatch(block, TYPOGRAPHY_SECTION_KEYS, patch)

      expect('textColor' in result).toBe(false)
      expect('textColorToken' in result).toBe(false)
      expect(result.textAlign).toBe('center')
      expect(result.text).toBe('Tytuł')
      expect(result.level).toBe('h2')
    })

    it('legacy header/cta textColor: removal passes RUNTIME validation (registry mixin is optional)', () => {
      // HeaderBlock/CtaBlock deklarują legacy `textColor: string` (wymagane w TS),
      // ale runtime'owy schemat (blockTypographyShape) ma textColor OPCJONALNY —
      // Phase 3 AAA-T-221: "editor leaves it unset". Usunięcie go z bloku jest
      // więc bezpieczne dla zapisu do DB.
      const headerBlock = {
        id: 'h1',
        type: 'header',
        companyName: 'Halo Efekt',
        textColor: '#0f172a',
      }
      const cleared = applySectionPatch(headerBlock, TYPOGRAPHY_SECTION_KEYS, {})
      expect('textColor' in cleared).toBe(false)

      const parsed = updateEmailTemplateSchema.safeParse({
        subject: 'Test',
        blocks: [cleared],
      })
      expect(parsed.success).toBe(true)
    })
  })
})
