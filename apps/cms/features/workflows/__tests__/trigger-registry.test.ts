import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  TRIGGER_REGISTRY,
  TRIGGER_MAP,
  TRIGGER_TYPE_IDS,
  TRIGGER_TYPE_SET,
  TRIGGER_TYPE_LABEL_KEYS,
  TRIGGER_TYPES_WITH_SURVEY_LINK,
  type TriggerType,
} from '../trigger-registry'

// Registry is zero-dep: only type-only imports from @agency/validators.
// No mocks required (no messages.ts, no Lucide, no Zod, no React).

describe('TRIGGER_REGISTRY — derivation correctness', () => {
  it('TRIGGER_TYPE_IDS length matches TRIGGER_REGISTRY length', () => {
    expect(TRIGGER_TYPE_IDS.length).toBe(TRIGGER_REGISTRY.length)
  })

  it('every id in TRIGGER_TYPE_IDS resolves via TRIGGER_MAP', () => {
    for (const id of TRIGGER_TYPE_IDS) {
      expect(TRIGGER_MAP[id]).toBeDefined()
      expect(TRIGGER_MAP[id].id).toBe(id)
    }
  })

  it('TRIGGER_TYPE_SET has every id from the registry', () => {
    for (const t of TRIGGER_REGISTRY) {
      expect(TRIGGER_TYPE_SET.has(t.id)).toBe(true)
    }
  })

  it('TRIGGER_TYPE_SET size matches registry length (no duplicates)', () => {
    expect(TRIGGER_TYPE_SET.size).toBe(TRIGGER_REGISTRY.length)
  })

  it('TRIGGER_TYPE_LABEL_KEYS has a non-empty string for every trigger id', () => {
    for (const t of TRIGGER_REGISTRY) {
      const key = TRIGGER_TYPE_LABEL_KEYS[t.id as TriggerType]
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(0)
      expect(key).toBe(t.labelKey)
    }
  })

  it('every registry id is non-empty', () => {
    for (const t of TRIGGER_REGISTRY) {
      expect(typeof t.id).toBe('string')
      expect(t.id.length).toBeGreaterThan(0)
    }
  })
})

describe('TRIGGER_REGISTRY — carriesSurveyLinkId single-source-of-truth invariant', () => {
  it('TRIGGER_TYPES_WITH_SURVEY_LINK size matches count of carriesSurveyLinkId:true entries', () => {
    const expectedCount = TRIGGER_REGISTRY.filter((t) => t.carriesSurveyLinkId).length
    expect(TRIGGER_TYPES_WITH_SURVEY_LINK.size).toBe(expectedCount)
  })

  it('every id in TRIGGER_TYPES_WITH_SURVEY_LINK has carriesSurveyLinkId === true in TRIGGER_MAP', () => {
    for (const id of TRIGGER_TYPES_WITH_SURVEY_LINK) {
      const def = TRIGGER_MAP[id as TriggerType]
      expect(def).toBeDefined()
      expect(def.carriesSurveyLinkId).toBe(true)
    }
  })

  it('every id NOT in TRIGGER_TYPES_WITH_SURVEY_LINK has carriesSurveyLinkId === false', () => {
    for (const t of TRIGGER_REGISTRY) {
      if (!TRIGGER_TYPES_WITH_SURVEY_LINK.has(t.id)) {
        expect(t.carriesSurveyLinkId).toBe(false)
      }
    }
  })
})

describe('TRIGGER_REGISTRY — hasLiveDispatcher invariant', () => {
  it('at least one trigger has hasLiveDispatcher: false (registry permits no-dispatcher types)', () => {
    const withoutDispatcher = TRIGGER_REGISTRY.filter((t) => t.hasLiveDispatcher === false)
    expect(withoutDispatcher.length).toBeGreaterThan(0)
  })

  it('every trigger has hasLiveDispatcher as a boolean (not undefined)', () => {
    for (const t of TRIGGER_REGISTRY) {
      expect(typeof t.hasLiveDispatcher).toBe('boolean')
    }
  })
})

describe('TRIGGER_REGISTRY — keystone trigger spot checks', () => {
  it('survey_submitted is present in the registry', () => {
    expect(TRIGGER_TYPE_SET.has('survey_submitted')).toBe(true)
  })

  it('booking_created is present in the registry', () => {
    expect(TRIGGER_TYPE_SET.has('booking_created')).toBe(true)
  })

  it('survey_submitted carriesSurveyLinkId === true (AAA-T-63 invariant)', () => {
    expect(TRIGGER_MAP['survey_submitted'].carriesSurveyLinkId).toBe(true)
  })

  it('booking_created carriesSurveyLinkId === true (AAA-T-63 invariant)', () => {
    expect(TRIGGER_MAP['booking_created'].carriesSurveyLinkId).toBe(true)
  })

  it('lead_scored hasLiveDispatcher === false (deferred dispatcher, AAA-T-285 follow-up)', () => {
    expect(TRIGGER_MAP['lead_scored'].hasLiveDispatcher).toBe(false)
  })

  it('scheduled hasLiveDispatcher === false (deferred dispatcher, AAA-T-285)', () => {
    expect(TRIGGER_MAP['scheduled'].hasLiveDispatcher).toBe(false)
  })
})

describe('TRIGGER_REGISTRY — TriggerType union compile-time check', () => {
  it('TriggerType union narrows to literal ids (compile-time)', () => {
    // If TRIGGER_REGISTRY were not `as const`, this assignment would be `string`
    // and these specific-id assignments would not be type-safe.
    const a: TriggerType = 'survey_submitted'
    const b: TriggerType = 'booking_created'
    const c: TriggerType = 'lead_scored'
    const d: TriggerType = 'manual'
    const e: TriggerType = 'scheduled'

    // Runtime sanity — make sure these are all present.
    for (const id of [a, b, c, d, e]) {
      expect(TRIGGER_TYPE_SET.has(id)).toBe(true)
    }
  })
})

describe('TRIGGER_REGISTRY — icon diversity (Phase 1 Q4)', () => {
  it('registry uses at least 4 distinct iconName values (not all-Zap)', () => {
    const distinctIcons = new Set(TRIGGER_REGISTRY.map((t) => t.iconName))
    expect(distinctIcons.size).toBeGreaterThanOrEqual(4)
  })

  it('every trigger has a non-empty iconName string', () => {
    for (const t of TRIGGER_REGISTRY) {
      expect(typeof t.iconName).toBe('string')
      expect(t.iconName.length).toBeGreaterThan(0)
    }
  })
})

describe('TRIGGER_REGISTRY — zero-dep audit (source file)', () => {
  it('trigger-registry.ts imports ONLY type-only from @agency/validators', () => {
    const source = readFileSync(
      resolve(__dirname, '../trigger-registry.ts'),
      'utf-8',
    )

    // No runtime forbidden imports — the registry must not pull in any of these.
    expect(source).not.toMatch(/from\s+['"]lucide-react['"]/)
    expect(source).not.toMatch(/from\s+['"]zod['"]/)
    expect(source).not.toMatch(/from\s+['"]@\/lib\/messages['"]/)
    expect(source).not.toMatch(/from\s+['"]react['"]/)

    // The only external import allowed is type-only from @agency/validators.
    const importLines = source
      .split('\n')
      .filter((l) => /^\s*import\b/.test(l))

    for (const line of importLines) {
      // Allow `import type { ... } from '@agency/validators'`
      const isValidatorsTypeImport = /^\s*import\s+type\s+\{[^}]+\}\s+from\s+['"]@agency\/validators['"]/.test(line)
      if (isValidatorsTypeImport) continue

      // Any other import line is a violation.
      throw new Error(`Forbidden import in trigger-registry.ts: ${line.trim()}`)
    }
  })
})
