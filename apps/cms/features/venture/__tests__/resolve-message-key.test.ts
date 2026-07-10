import { describe, it, expect } from 'vitest'
import { messages } from '@/lib/messages'
import { resolveMessageKey } from '../utils/resolve-message-key'

describe('resolveMessageKey', () => {
  it('resolves a known dotted key to its string', () => {
    expect(resolveMessageKey('venture.slugTaken')).toBe(messages.venture.slugTaken)
  })

  it('returns the raw key on an unknown dotted path', () => {
    expect(resolveMessageKey('venture.doesNotExist')).toBe('venture.doesNotExist')
  })

  it('returns the raw key for a top-level key that resolves to an object (not a string)', () => {
    // Top-level `messages` entries are feature objects, not strings — the
    // single-segment reduce lands on an object, so the raw key is returned.
    expect(resolveMessageKey('venture')).toBe('venture')
  })
})
