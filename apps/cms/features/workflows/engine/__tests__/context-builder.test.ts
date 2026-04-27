import { describe, it, expect } from 'vitest'
import { flattenContextForLlm } from '../context-builder'

describe('flattenContextForLlm', () => {

  // ─── Podstawowe przypadki ────────────────────────────────────────────────

  it('zwraca pusty string dla pustego contextu', () => {
    expect(flattenContextForLlm({})).toBe('')
  })

  it('wstawia skalarne pola trigger-level bez zmian', () => {
    const ctx = { responseId: 'uuid-123', trigger_type: 'survey_submitted' }
    const result = flattenContextForLlm(ctx)
    expect(result).toContain('responseId: "uuid-123"')
    expect(result).toContain('trigger_type: "survey_submitted"')
  })

  it('wstawia liczby bez cudzysłowów', () => {
    const ctx = { step1: { overallScore: 7 } }
    expect(flattenContextForLlm(ctx)).toContain('overallScore: 7')
  })

  it('wstawia booleany', () => {
    const ctx = { step1: { emailSent: true } }
    expect(flattenContextForLlm(ctx)).toContain('emailSent: true')
  })

  // ─── Namespace kroków ─────────────────────────────────────────────────────

  it('spłaszcza obiekt namespace kroku (step1) do poziomu głównego', () => {
    const ctx = {
      responseId: 'uuid-123',
      step1: { status: 'new', respondentName: 'Marcin' },
    }
    const result = flattenContextForLlm(ctx)
    expect(result).toContain('responseId: "uuid-123"')
    expect(result).toContain('status: "new"')
    expect(result).toContain('respondentName: "Marcin"')
    // klucz namespace (step1) nie pojawia się jako osobna linia
    expect(result).not.toMatch(/^step1:/m)
  })

  it('spłaszcza wiele namespace\'ów kroków', () => {
    const ctx = {
      step1: { qaContext: 'Q: Imię\nA: Marcin' },
      step2: { overallScore: 8, recommendation: 'Proceed' },
    }
    const result = flattenContextForLlm(ctx)
    expect(result).toContain('overallScore: 8')
    expect(result).toContain('recommendation: "Proceed"')
    expect(result).toContain('qaContext:')
    expect(result).not.toMatch(/^step1:/m)
    expect(result).not.toMatch(/^step2:/m)
  })

  // ─── aiOutputJson jest pomijane ───────────────────────────────────────────

  it('pomija pole aiOutputJson wewnątrz namespace kroku', () => {
    const ctx = {
      step1: {
        overallScore: 7,
        aiOutputJson: { overallScore: 7, recommendation: 'Proceed' },
      },
    }
    const result = flattenContextForLlm(ctx)
    expect(result).toContain('overallScore: 7')
    expect(result).not.toContain('aiOutputJson')
  })

  it('nie pomija innych pól zawierających słowo "json"', () => {
    const ctx = { step1: { jsonResponse: 'raw', aiOutputJson: {} } }
    const result = flattenContextForLlm(ctx)
    expect(result).toContain('jsonResponse: "raw"')
    expect(result).not.toContain('aiOutputJson')
  })

  // ─── Typy specjalne ───────────────────────────────────────────────────────

  it('traktuje null jako skalarne (nie spłaszcza)', () => {
    const ctx = { step1: { aiQualification: null } }
    expect(flattenContextForLlm(ctx)).toContain('aiQualification: null')
  })

  it('traktuje tablice jako skalarne (nie spłaszcza)', () => {
    const ctx = { step1: { answers: [{ q: 'Imię', a: 'Marcin' }] } }
    const result = flattenContextForLlm(ctx)
    expect(result).toContain('answers: [')
  })

  it('trigger-level null pojawia się w wyniku', () => {
    const ctx = { responseId: null }
    expect(flattenContextForLlm(ctx)).toContain('responseId: null')
  })

  // ─── Format wyjściowy ─────────────────────────────────────────────────────

  it('każde pole jest na osobnej linii', () => {
    const ctx = {
      trigger_type: 'survey_submitted',
      step1: { overallScore: 7, recommendation: 'Proceed' },
    }
    const lines = flattenContextForLlm(ctx).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines.every(l => l.includes(': '))).toBe(true)
  })

  it('trigger-level pola pojawiają się przed polami z namespace kroków', () => {
    const ctx = {
      responseId: 'uuid-123',
      step1: { overallScore: 7 },
    }
    const result = flattenContextForLlm(ctx)
    const responseIdIdx = result.indexOf('responseId')
    const overallScoreIdx = result.indexOf('overallScore')
    expect(responseIdIdx).toBeLessThan(overallScoreIdx)
  })
})
