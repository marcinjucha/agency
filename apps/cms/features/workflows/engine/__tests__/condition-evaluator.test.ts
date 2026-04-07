import { describe, it, expect } from 'vitest'
import { evaluateCondition } from '../condition-evaluator'

// ---------------------------------------------------------------------------
// Group 1: Equality operators (== and !=)
// ---------------------------------------------------------------------------

describe('evaluateCondition — equality operators', () => {
  it('returns "true" when field equals expected value', () => {
    expect(evaluateCondition('status == QUALIFIED', { status: 'QUALIFIED' })).toBe('true')
  })

  it('returns "false" when field does not equal expected value', () => {
    expect(evaluateCondition('status == QUALIFIED', { status: 'DISQUALIFIED' })).toBe('false')
  })

  it('returns "true" when field differs from value with !=', () => {
    expect(evaluateCondition('status != QUALIFIED', { status: 'DISQUALIFIED' })).toBe('true')
  })

  it('returns "false" when field equals value with !=', () => {
    expect(evaluateCondition('status != QUALIFIED', { status: 'QUALIFIED' })).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Group 2: Numeric comparisons (>, <, >=, <=)
// ---------------------------------------------------------------------------

describe('evaluateCondition — numeric comparisons', () => {
  it('returns "true" when numeric field >= threshold (core workflow use case)', () => {
    expect(evaluateCondition('overallScore >= 10', { overallScore: 15 })).toBe('true')
  })

  it('returns "false" when numeric field < threshold', () => {
    expect(evaluateCondition('overallScore >= 10', { overallScore: 5 })).toBe('false')
  })

  it('returns "false" for > at exact boundary', () => {
    expect(evaluateCondition('overallScore > 10', { overallScore: 10 })).toBe('false')
  })

  it('returns "true" for <= at exact boundary', () => {
    expect(evaluateCondition('overallScore <= 5', { overallScore: 5 })).toBe('true')
  })

  it('returns "false" for < at exact boundary', () => {
    expect(evaluateCondition('overallScore < 5', { overallScore: 5 })).toBe('false')
  })

  it('coerces string field value to number for comparison', () => {
    expect(evaluateCondition('score >= 10', { score: '15' })).toBe('true')
  })

  it('returns "false" when right-hand value is non-numeric', () => {
    expect(evaluateCondition('score > abc', { score: 10 })).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Group 3: String operators (contains, in)
// ---------------------------------------------------------------------------

describe('evaluateCondition — string operators', () => {
  it('returns "true" when field contains substring', () => {
    expect(evaluateCondition('tags contains automation', { tags: 'automation,crm' })).toBe('true')
  })

  it('returns "false" when field does not contain substring', () => {
    expect(evaluateCondition('tags contains missing', { tags: 'automation,crm' })).toBe('false')
  })

  it('returns "true" when field value is in comma-separated list', () => {
    expect(evaluateCondition('status in new,qualified,contacted', { status: 'qualified' })).toBe('true')
  })

  it('returns "false" when field value is not in list', () => {
    expect(evaluateCondition('status in new,qualified', { status: 'closed' })).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Group 4: {{variable}} wrapper stripping (REAL BUG — documented in memory.md)
// ---------------------------------------------------------------------------

describe('evaluateCondition — {{}} wrapper stripping', () => {
  it('strips {{}} from field name for numeric comparison', () => {
    expect(evaluateCondition('{{overallScore}} >= 10', { overallScore: 15 })).toBe('true')
  })

  it('strips {{}} from field name for equality comparison', () => {
    expect(evaluateCondition('{{status}} == QUALIFIED', { status: 'QUALIFIED' })).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// Group 5: Nested path resolution
// ---------------------------------------------------------------------------

describe('evaluateCondition — nested paths', () => {
  it('resolves dot-separated nested fields', () => {
    expect(evaluateCondition('data.score >= 10', { data: { score: 15 } })).toBe('true')
  })

  it('resolves nested fields with {{}} wrapper', () => {
    expect(evaluateCondition('{{data.score}} >= 10', { data: { score: 15 } })).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// Group 6: Fail-closed behavior (SECURITY-CRITICAL)
// ---------------------------------------------------------------------------

describe('evaluateCondition — fail-closed', () => {
  it('returns "false" for unparseable expression', () => {
    expect(evaluateCondition('just garbage', {})).toBe('false')
  })

  it('returns "false" for empty expression', () => {
    expect(evaluateCondition('', {})).toBe('false')
  })

  it('returns "false" when field is missing from context', () => {
    expect(evaluateCondition('missingField == value', {})).toBe('false')
  })

  it('returns "false" for == when field is null (String(null) !== "value")', () => {
    expect(evaluateCondition('field == value', { field: null })).toBe('false')
  })

  it('returns "true" for == when comparing null field to literal "null"', () => {
    // String(null) === "null" — compare runs because field exists (not undefined)
    expect(evaluateCondition('field == null', { field: null })).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// Group 7: Whitespace tolerance
// ---------------------------------------------------------------------------

describe('evaluateCondition — whitespace tolerance', () => {
  it('handles extra whitespace in expression', () => {
    expect(evaluateCondition('  overallScore   >=   10  ', { overallScore: 15 })).toBe('true')
  })
})
