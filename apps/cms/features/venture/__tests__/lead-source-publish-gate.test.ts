import { describe, it, expect } from 'vitest'
import { evaluateEditorPublishGate } from '../utils/lead-source-publish-gate'

// UI mirror of the server publish gate. Tally's only required config field is a
// `secret` (persists to the dedicated tally_webhook_secret column), so these
// cases exercise the secret-satisfaction rule specifically.
describe('evaluateEditorPublishGate', () => {
  it('blocks publish with reason no_provider when no source is selected (draft)', () => {
    const result = evaluateEditorPublishGate({
      provider: null,
      secretAlreadySet: false,
      secretInput: '',
      config: {},
    })
    expect(result).toEqual({ ok: false, reason: 'no_provider' })
  })

  it('blocks publish when provider is set but no secret exists (unconfigured)', () => {
    const result = evaluateEditorPublishGate({
      provider: 'tally',
      secretAlreadySet: false,
      secretInput: '',
      config: {},
    })
    expect(result).toEqual({ ok: false, reason: 'incomplete_config' })
  })

  it('allows publish when the secret is already persisted on the row', () => {
    const result = evaluateEditorPublishGate({
      provider: 'tally',
      secretAlreadySet: true,
      secretInput: '',
      config: {},
    })
    expect(result).toEqual({ ok: true })
  })

  it('allows publish when the operator typed a secret this session (not yet saved)', () => {
    const result = evaluateEditorPublishGate({
      provider: 'tally',
      secretAlreadySet: false,
      secretInput: '  whsec_abc  ',
      config: {},
    })
    expect(result).toEqual({ ok: true })
  })

  it('treats a whitespace-only typed secret as unset', () => {
    const result = evaluateEditorPublishGate({
      provider: 'tally',
      secretAlreadySet: false,
      secretInput: '   ',
      config: {},
    })
    expect(result).toEqual({ ok: false, reason: 'incomplete_config' })
  })

  it('blocks publish for an unknown/unregistered provider id', () => {
    const result = evaluateEditorPublishGate({
      provider: 'mailchimp',
      secretAlreadySet: true,
      secretInput: '',
      config: {},
    })
    expect(result).toEqual({ ok: false, reason: 'no_provider' })
  })
})
