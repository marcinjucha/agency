import { describe, it, expect } from 'vitest'
import { validateVariableKey } from '../utils/validate-variable-key'
import type { TemplateVariable } from '../types'

describe('validateVariableKey', () => {
  const baseVars: TemplateVariable[] = [
    { key: 'firstName', label: 'firstName', source: 'trigger' },
    { key: 'bonusCode', label: 'Bonus', source: 'manual' },
  ]

  it('returns null for empty key (work-in-progress)', () => {
    expect(validateVariableKey('', 0, baseVars)).toBeNull()
  })

  it.each([['hello'], ['foo_bar'], ['UPPER'], ['a1b2'], ['_underscore_start']])(
    'accepts valid \\w pattern: %s',
    (key) => {
      expect(validateVariableKey(key, 0, [])).toBeNull()
    }
  )

  it.each([['foo-bar'], ['foo bar'], ['foo.bar'], ['foo!'], ['foo#'], ['a'.repeat(101)]])(
    'rejects invalid key: %s',
    (key) => {
      expect(validateVariableKey(key, 0, [])).not.toBeNull()
    }
  )

  it('flags duplicate key at different index', () => {
    expect(validateVariableKey('firstName', 5, baseVars)).not.toBeNull()
  })

  it('does NOT flag key matching its own index (self)', () => {
    expect(validateVariableKey('firstName', 0, baseVars)).toBeNull()
  })
})
