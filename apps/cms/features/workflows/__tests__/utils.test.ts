import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock ../utils/step-labels to avoid importing @/lib/messages (which pulls in the full app context)
vi.mock('../utils/step-labels', () => ({
  STEP_TYPE_LABELS: {
    send_email: 'Wyślij email',
    delay: 'Opóźnienie',
    condition: 'Warunek',
    webhook: 'Webhook',
    ai_action: 'Akcja AI',
  },
  getStepTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      send_email: 'Wyślij email',
      delay: 'Opóźnienie',
      condition: 'Warunek',
      webhook: 'Webhook',
      ai_action: 'Akcja AI',
    }
    return labels[type] ?? type
  },
}))

// Mock ../types to avoid importing @/lib/messages (which pulls in the full app context)
vi.mock('../types', () => ({
  TRIGGER_TYPE_LABELS: {
    survey_submitted: 'Formularz wysłany',
    booking_created: 'Rezerwacja utworzona',
    lead_scored: 'Lead oceniony',
    manual: 'Ręczny',
    scheduled: 'Zaplanowany',
  },
  EXECUTION_STATUS_LABELS: {
    pending: 'Oczekuje',
    running: 'W trakcie',
    completed: 'Zakończono',
    failed: 'Błąd',
    cancelled: 'Anulowano',
    paused: 'Wstrzymano',
  },
  STEP_EXECUTION_STATUS_LABELS: {
    pending: 'Oczekuje',
    running: 'W trakcie',
    completed: 'Zakończono',
    failed: 'Błąd',
    skipped: 'Pominięto',
    waiting: 'Czeka',
    processing: 'Przetwarzanie',
  },
}))

import {
  formatDate,
  getTriggerTypeLabel,
  getStepTypeLabel,
  getExecutionStatusLabel,
  getStepExecutionStatusLabel,
  formatDuration,
  formatExecutionDuration,
} from '../utils'

// --- formatDate ---

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fixed "now": 2026-04-07T12:00:00Z
    vi.setSystemTime(new Date('2026-04-07T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns em-dash for null input', () => {
    expect(formatDate(null)).toBe('\u2014')
  })

  it('returns relative time for dates within 7 days', () => {
    // 2 days ago
    const twoDaysAgo = '2026-04-05T12:00:00Z'
    const result = formatDate(twoDaysAgo)
    // Polish relative time should contain "temu" (ago)
    expect(result).toContain('temu')
  })

  it('returns localized date for dates older than 7 days', () => {
    // 10 days ago
    const oldDate = '2026-03-28T12:00:00Z'
    const result = formatDate(oldDate)
    // Should be a localized Polish date like "28 mar 2026"
    expect(result).toMatch(/\d{1,2}\s\w+\s\d{4}/)
  })

  it('returns em-dash for unparseable date string', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('\u2014')
  })

  // --- Deterministic tests using explicit `now` parameter ---

  describe('with explicit now parameter (deterministic, no fake timers)', () => {
    const NOW = new Date('2026-04-07T12:00:00Z')

    it('returns relative time for 30 seconds ago', () => {
      const past = new Date(NOW.getTime() - 30 * 1000).toISOString()
      const result = formatDate(past, NOW)
      // Polish "ago" suffix
      expect(result).toContain('temu')
    })

    it('returns relative time for 5 minutes ago', () => {
      const past = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString()
      const result = formatDate(past, NOW)
      expect(result).toContain('temu')
      // Should mention minutes
      expect(result.toLowerCase()).toMatch(/minut/)
    })

    it('returns relative time for 2 hours ago', () => {
      const past = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString()
      const result = formatDate(past, NOW)
      expect(result).toContain('temu')
      expect(result.toLowerCase()).toMatch(/godz/)
    })

    it('returns relative time for 3 days ago', () => {
      const past = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const result = formatDate(past, NOW)
      expect(result).toContain('temu')
      expect(result.toLowerCase()).toMatch(/dni/)
    })

    it('returns absolute Polish date for 8 days ago', () => {
      const past = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
      const result = formatDate(past, NOW)
      // Should NOT contain "temu" \u2014 it's outside the 7-day window
      expect(result).not.toContain('temu')
      // Should be a localized Polish date like "30 mar 2026"
      expect(result).toMatch(/\d{1,2}\s\w+\s\d{4}/)
    })

    it('returns em-dash for null input even with now provided', () => {
      expect(formatDate(null, NOW)).toBe('\u2014')
    })

    it('returns em-dash for invalid date string even with now provided', () => {
      expect(formatDate('not-a-date', NOW)).toBe('\u2014')
    })

    it('produces identical output to no-arg form when now matches system time', () => {
      const past = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      // Both should produce same relative-time output (within the same fake-timer "now")
      const withExplicitNow = formatDate(past, NOW)
      const withDefaultNow = formatDate(past)
      expect(withExplicitNow).toBe(withDefaultNow)
    })
  })
})

// --- formatDuration ---

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('45 s')
  })

  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0 s')
  })

  it('formats minutes only', () => {
    expect(formatDuration(300)).toBe('5 min')
  })

  it('formats hours only', () => {
    expect(formatDuration(3600)).toBe('1 godz')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(5400)).toBe('1 godz 30 min')
  })
})

// --- formatExecutionDuration ---

describe('formatExecutionDuration', () => {
  it('returns en-dash when startedAt is null', () => {
    expect(formatExecutionDuration(null, '2026-04-07T12:01:00Z')).toBe('\u2013')
  })

  it('returns en-dash when completedAt is null', () => {
    expect(formatExecutionDuration('2026-04-07T12:00:00Z', null)).toBe('\u2013')
  })

  it('returns en-dash when both are null', () => {
    expect(formatExecutionDuration(null, null)).toBe('\u2013')
  })

  it('formats seconds duration', () => {
    expect(
      formatExecutionDuration('2026-04-07T12:00:00Z', '2026-04-07T12:00:45Z')
    ).toBe('45s')
  })

  it('formats minutes and seconds duration', () => {
    expect(
      formatExecutionDuration('2026-04-07T12:00:00Z', '2026-04-07T12:02:30Z')
    ).toBe('2m 30s')
  })

  it('formats hours and minutes duration', () => {
    expect(
      formatExecutionDuration('2026-04-07T12:00:00Z', '2026-04-07T13:15:00Z')
    ).toBe('1g 15m')
  })
})

// --- label getters ---

describe('getTriggerTypeLabel', () => {
  it('returns label for known trigger type', () => {
    expect(getTriggerTypeLabel('survey_submitted')).toBe('Formularz wysłany')
  })

  it('returns raw type string for unknown trigger type', () => {
    expect(getTriggerTypeLabel('unknown_trigger' as any)).toBe('unknown_trigger')
  })
})

describe('getStepTypeLabel', () => {
  it('returns label for known step type', () => {
    expect(getStepTypeLabel('send_email')).toBe('Wyślij email')
  })

  it('returns raw type string for unknown step type', () => {
    expect(getStepTypeLabel('unknown_step' as any)).toBe('unknown_step')
  })
})

describe('getExecutionStatusLabel', () => {
  it('returns label for known execution status', () => {
    expect(getExecutionStatusLabel('completed')).toBe('Zakończono')
  })

  it('returns raw status string for unknown status', () => {
    expect(getExecutionStatusLabel('unknown_status' as any)).toBe('unknown_status')
  })
})

describe('getStepExecutionStatusLabel', () => {
  it('returns label for known step execution status', () => {
    expect(getStepExecutionStatusLabel('completed')).toBe('Zakończono')
  })

  it('returns raw status string for unknown status', () => {
    expect(getStepExecutionStatusLabel('unknown_status' as any)).toBe('unknown_status')
  })
})
