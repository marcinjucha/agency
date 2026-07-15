import { describe, it, expect } from 'vitest'
import { renderEmailBlocks } from '../EmailRenderer'
import type { Block } from '../blocks/types'

/**
 * E2E parytetu kompozycji (Iter 4): DOWÓD, że docelowy szablon "Przystań
 * Inwestorów" (referencyjny mail bonusowy) da się w całości złożyć z bloków
 * edytora — dark header card, heading, tekst, eyebrow "TWOJE MATERIAŁY",
 * karty materiałów (sekcja z ramką: heading + tekst + CTA), info-box
 * (sekcja z tłem), divider, wyśrodkowana stopka + preheader.
 *
 * Test jest strażnikiem regresji: jeśli którykolwiek klocek przestanie się
 * składać (typy, renderer, zagnieżdżanie), posypie się tu, a nie u usera.
 */

const NAVY = '#1a2342'
const GOLD = '#c9a227'

function materialCard(id: string, title: string, desc: string): Block {
  return {
    id: `card-${id}`,
    type: 'section',
    padding: 'md',
    borderColor: '#e2e8f0',
    borderRadius: 'soft',
    marginBottom: 'normal',
    children: [
      { id: `card-${id}-h`, type: 'heading', text: title, level: 'h3', color: NAVY },
      { id: `card-${id}-t`, type: 'text', content: `<p>${desc}</p>` },
      {
        id: `card-${id}-cta`,
        type: 'cta',
        label: 'Zrób kopię',
        url: 'https://example.com/arkusz',
        textColor: '#ffffff',
        backgroundColor: NAVY,
      },
    ],
  } as Block
}

export const TARGET_BLOCKS: Block[] = [
  { id: 'preheader', type: 'preview', text: 'Twoje materiały są gotowe do pobrania' },
  {
    id: 'hdr',
    type: 'header',
    companyName: 'Przystań Inwestorów',
    textColor: '#ffffff',
    backgroundColor: NAVY,
    borderColor: GOLD,
  },
  { id: 'hi', type: 'heading', text: 'Cześć!', level: 'h1', color: NAVY },
  {
    id: 'intro',
    type: 'text',
    content:
      '<p>Dziękujemy za wypełnienie ankiety. Poniżej masz wszystko, co dla Ciebie przygotowaliśmy.</p>',
  },
  { id: 'eyebrow', type: 'heading', text: 'Twoje materiały', level: 'eyebrow', color: NAVY },
  materialCard('1', 'Kalkulator Inwestycyjny', 'Zobacz, ile realnie urośnie Twój portfel po podatku i inflacji.'),
  materialCard('2', 'Zaawansowany Budżet Miesięczny', 'Arkusz do uporządkowania miesięcznych wpływów i wydatków.'),
  {
    id: 'infobox',
    type: 'section',
    padding: 'md',
    backgroundColor: '#eef2f7',
    borderRadius: 'soft',
    marginBottom: 'normal',
    children: [
      {
        id: 'infobox-t',
        type: 'text',
        content:
          '<p>Każdy przycisk otwiera arkusz w Google. Kliknij „Zrób kopię", żeby zapisać własną wersję na swoim dysku.</p>',
      },
    ],
  },
  { id: 'div', type: 'divider', color: '#e5e7eb' },
  {
    id: 'foot',
    type: 'footer',
    text: 'Materiały mają charakter edukacyjny i nie stanowią porady inwestycyjnej.',
    textAlign: 'center',
  },
  { id: 'more', type: 'link', label: 'Odwiedź Przystań Inwestorów', url: 'https://example.com' },
] as Block[]

describe('docelowy szablon (Iter 4 e2e) — składalny w całości z bloków', () => {
  it('renderuje wszystkie elementy referencyjnego maila', async () => {
    const html = await renderEmailBlocks(TARGET_BLOCKS)

    // Preheader ukryty w inboxie
    expect(html).toContain('Twoje materiały są gotowe do pobrania')
    // Dark header card
    expect(html).toContain('Przystań Inwestorów')
    expect(html).toContain(NAVY)
    // Heading + intro
    expect(html).toContain('Cześć!')
    expect(html).toContain('Dziękujemy za wypełnienie ankiety')
    // Eyebrow: uppercase + letter-spacing
    expect(html).toMatch(/text-transform:\s*uppercase/i)
    expect(html).toContain('Twoje materiały')
    // Karty materiałów: sekcje z ramką + zawartość + CTA
    expect(html).toContain('Kalkulator Inwestycyjny')
    expect(html).toContain('Zaawansowany Budżet Miesięczny')
    // 2 przyciski + 1 wzmianka w tekście info-boxa („Zrób kopię")
    expect((html.match(/Zrób kopię/g) ?? []).length).toBe(3)
    expect(html).toMatch(/border-width:\s*1px/i)
    expect(html).toMatch(/border-radius:\s*8px/i)
    // Info-box: sekcja z tłem
    expect(html).toContain('#eef2f7')
    expect(html).toContain('otwiera arkusz w Google')
    // Divider + stopka + link
    expect(html).toContain('#e5e7eb')
    expect(html).toContain('nie stanowią porady inwestycyjnej')
    expect(html).toContain('Odwiedź Przystań Inwestorów')
    expect(html).toContain('https://example.com')
  })

  it('zagnieżdżone CTA w kartach zachowują kolory (dzieci sekcji renderują się pełną drabinką)', async () => {
    const html = await renderEmailBlocks(TARGET_BLOCKS)
    // Przyciski w kartach: białe litery na granatowym tle
    expect(html).toMatch(new RegExp(`background-color:\\s*${NAVY}`, 'i'))
  })
})
