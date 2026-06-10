import { describe, it, expect } from 'vitest'
import { resolveInsertAlt } from '../insert-alt'

describe('resolveInsertAlt — alt_text || name fallback (public <img> never missing alt)', () => {
  it('uses alt_text when present', () => {
    expect(resolveInsertAlt({ name: 'photo.jpg', alt_text: 'Zespół podczas warsztatu' })).toBe(
      'Zespół podczas warsztatu'
    )
  })

  it('falls back to name when alt_text is null', () => {
    expect(resolveInsertAlt({ name: 'photo.jpg', alt_text: null })).toBe('photo.jpg')
  })

  it('falls back to name when alt_text is undefined', () => {
    expect(resolveInsertAlt({ name: 'photo.jpg' })).toBe('photo.jpg')
  })

  it('falls back to name when alt_text is empty string', () => {
    expect(resolveInsertAlt({ name: 'photo.jpg', alt_text: '' })).toBe('photo.jpg')
  })

  it('falls back to name when alt_text is whitespace only', () => {
    expect(resolveInsertAlt({ name: 'photo.jpg', alt_text: '   ' })).toBe('photo.jpg')
  })

  it('trims surrounding whitespace from a real alt_text', () => {
    expect(resolveInsertAlt({ name: 'photo.jpg', alt_text: '  opis  ' })).toBe('opis')
  })
})
