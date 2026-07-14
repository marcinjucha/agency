import { describe, it, expect } from 'vitest'
import { VENTURE_BONUS_MARKER } from '@/lib/app-sent-variables'
import { isBonusListMarkerBlock } from '../utils/bonus-list-marker'
import type { Block } from '../types'

// Minimal text-block factory — only the fields the predicate reads matter.
function textBlock(content: string): Block {
  return { id: 'b1', type: 'text', content } as Block
}

describe('isBonusListMarkerBlock', () => {
  it('is true for a text block whose content is exactly the marker', () => {
    expect(isBonusListMarkerBlock(textBlock(VENTURE_BONUS_MARKER))).toBe(true)
  })

  it('is true when the marker is surrounded by whitespace (trimmed)', () => {
    expect(isBonusListMarkerBlock(textBlock(`  ${VENTURE_BONUS_MARKER}\n`))).toBe(true)
  })

  it('is false for a text block with other content', () => {
    expect(isBonusListMarkerBlock(textBlock('<p>Zwykły akapit</p>'))).toBe(false)
  })

  it('is false when the marker is embedded in other text (not the whole block)', () => {
    expect(
      isBonusListMarkerBlock(textBlock(`Oto bonusy: ${VENTURE_BONUS_MARKER}`)),
    ).toBe(false)
  })

  it('is false for a non-text block even if content-like', () => {
    const heading = { id: 'h1', type: 'heading', text: VENTURE_BONUS_MARKER, level: 'h2' } as Block
    expect(isBonusListMarkerBlock(heading)).toBe(false)
  })
})
