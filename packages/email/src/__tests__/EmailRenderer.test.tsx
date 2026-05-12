import { describe, it, expect } from 'vitest'
import { renderEmailBlocks } from '../EmailRenderer'
import { DEFAULT_BLOCKS } from '../blocks/types'

describe('EmailRenderer', () => {
  it('renderEmailBlocks(DEFAULT_BLOCKS) produkuje stabilne HTML', async () => {
    const html = await renderEmailBlocks(DEFAULT_BLOCKS)

    // Podstawowe asercje strukturalne — zachowanie musi być identyczne przed i po refactorze
    expect(html).toContain('{{companyName}}')
    expect(html).toContain('{{surveyTitle}}')
    expect(html).toContain('{{clientName}}')
    expect(html).toContain('Zobacz zgłoszenie')
    expect(html).toContain('Wiadomość wygenerowana automatycznie')
    expect(html).toContain('#1a1a2e')
    expect(html).toContain('#e5e7eb')
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(100)

    // Snapshot — zablokuje przypadkowe zmiany HTML po refactorze
    expect(html).toMatchSnapshot()
  })
})
