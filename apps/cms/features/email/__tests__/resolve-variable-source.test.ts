import { describe, it, expect } from 'vitest'
import {
  resolveVariableSource,
  collectUnresolvableTokens,
} from '../utils/resolve-variable-source'

// APP-OWNED type = venture_bonus (only CMS-sent template). n8n/trigger-aligned
// types come from lib/trigger-schemas (form_confirmation, survey_submitted, ...).

describe('resolveVariableSource', () => {
  describe('app-owned (venture_bonus)', () => {
    it('classifies an app-supplied scalar as "app"', () => {
      expect(resolveVariableSource('companyName', 'venture_bonus').kind).toBe('app')
    })

    it('classifies the legacy bonus-list marker as "campaign" (NO longer "structural")', () => {
      // Iter 4b: the marker is no longer spliced → it must not read as auto-filled.
      expect(resolveVariableSource('bonus_list', 'venture_bonus').kind).toBe('campaign')
    })

    it('classifies any other token as informational "campaign" (NOT "unresolvable")', () => {
      // Filled per-campaign via so_campaigns.template_variable_values — the editor
      // cannot know which campaign fills what, so it is never a leak warning.
      expect(resolveVariableSource('firstName', 'venture_bonus').kind).toBe('campaign')
    })

    it('NEVER marks an app-owned token "unresolvable"', () => {
      expect(resolveVariableSource('anything', 'venture_bonus').kind).not.toBe('unresolvable')
      expect(resolveVariableSource('anything', 'venture_bonus').kind).not.toBe('structural')
    })
  })

  describe('n8n / trigger-aligned types', () => {
    it('classifies a schema-backed token as "workflow"', () => {
      expect(resolveVariableSource('clientName', 'form_confirmation').kind).toBe('workflow')
    })

    it('NEVER marks an n8n token unresolvable, even one absent from the schema', () => {
      expect(resolveVariableSource('somethingNotInSchema', 'form_confirmation').kind).toBe(
        'workflow',
      )
      expect(resolveVariableSource('anyKey', 'survey_submitted').kind).toBe('workflow')
    })
  })

  describe('custom / unknown slug', () => {
    it('classifies tokens as neutral "manual" (no warning)', () => {
      expect(resolveVariableSource('firstName', 'my_custom_blast').kind).toBe('manual')
    })
  })

  it('always returns a non-empty label', () => {
    expect(resolveVariableSource('companyName', 'venture_bonus').label.length).toBeGreaterThan(0)
    expect(resolveVariableSource('x', 'custom_slug').label.length).toBeGreaterThan(0)
  })
})

describe('collectUnresolvableTokens', () => {
  // Post Iter 3/4b: no token is editor-knowably unresolvable. venture_bonus fills
  // companyName from the app AND any other token PER-CAMPAIGN (invisible to the
  // editor) — so nothing can be asserted as "will reach the recipient literally".
  it('ALWAYS returns [] for an app-owned type (per-campaign resolvability unknowable)', () => {
    expect(
      collectUnresolvableTokens(['companyName', 'firstName', 'bonus_list'], 'venture_bonus', []),
    ).toEqual([])
  })

  it('returns [] for n8n/trigger-aligned types (resolvability invisible to editor)', () => {
    expect(
      collectUnresolvableTokens(['anything', 'clientName'], 'form_confirmation', []),
    ).toEqual([])
  })

  it('returns [] for custom/unknown slugs (never cry wolf on user slugs)', () => {
    expect(collectUnresolvableTokens(['firstName', 'foo'], 'my_custom_blast', [])).toEqual([])
  })
})
