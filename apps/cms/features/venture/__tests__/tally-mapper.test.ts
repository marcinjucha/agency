import { describe, it, expect } from 'vitest'
import { mapTallyPayload, TALLY_MAP_ERRORS, type TallyField } from '../tally'
import sampleWebhook from './fixtures/tally-webhook-sample.json'

// Wrap a field list in the FORM_RESPONSE envelope.
function payload(fields: TallyField[], submissionId = 'sub_abc'): unknown {
  return {
    eventId: 'evt_1',
    eventType: 'FORM_RESPONSE',
    createdAt: '2026-07-08T10:00:00Z',
    data: { submissionId, responseId: 'res_abc', fields },
  }
}

// Field keys are opaque hashes on purpose — the mapper must match by type +
// label, never rely on a specific key.
const CAMPAIGN_HIDDEN: TallyField = {
  key: 'question_x1',
  label: 'campaign',
  type: 'HIDDEN_FIELDS',
  value: 'kacper',
}
const SOURCE_HIDDEN: TallyField = {
  key: 'question_x2',
  label: 'source',
  type: 'HIDDEN_FIELDS',
  value: 'youtube',
}
const EMAIL_FIELD: TallyField = {
  key: 'question_email',
  label: 'Twój email',
  type: 'INPUT_EMAIL',
  value: 'jan@example.com',
}
const NAME_FIELD: TallyField = {
  key: 'question_name',
  label: 'Imię',
  type: 'INPUT_TEXT',
  value: 'Jan',
}

// A consent checkbox in real Tally emits a dual representation: an aggregate row
// (value = array of selected option ids) + per-option boolean rows
// (key = `${aggregateKey}_${optionId}`). Derived from the sample's
// question_wQ1K7w block.
function consentBlock(checked: boolean): TallyField[] {
  const OPT = 'opt-consent-1'
  return [
    {
      key: 'question_consent',
      label: 'Zgoda na kontakt',
      type: 'CHECKBOXES',
      value: checked ? [OPT] : [],
      options: [{ id: OPT, text: 'Tak, chcę wiedzieć o starcie' }],
    },
    {
      key: `question_consent_${OPT}`,
      label: 'Zgoda na kontakt (Tak)',
      type: 'CHECKBOXES',
      value: checked,
    },
  ]
}

describe('mapTallyPayload — synthetic fields', () => {
  it('extracts campaign, source, email, name, consent + submissionId from a full payload', () => {
    const result = mapTallyPayload(
      payload([CAMPAIGN_HIDDEN, SOURCE_HIDDEN, EMAIL_FIELD, NAME_FIELD, ...consentBlock(true)]),
    )

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({
      campaignSlug: 'kacper',
      email: 'jan@example.com',
      name: 'Jan',
      source: 'youtube',
      consentLaunch: true,
      submissionId: 'sub_abc',
    })
  })

  it('matches the email field by INPUT_EMAIL type even when the label is unrelated', () => {
    const result = mapTallyPayload(
      payload([
        CAMPAIGN_HIDDEN,
        { key: 'q', label: 'Adres kontaktowy', type: 'INPUT_EMAIL', value: 'x@y.pl' },
      ]),
    )
    expect(result._unsafeUnwrap().email).toBe('x@y.pl')
  })

  it('does NOT grab an unrelated field whose label contains "name" (e.g. a PAYMENT name)', () => {
    const result = mapTallyPayload(
      payload([
        CAMPAIGN_HIDDEN,
        EMAIL_FIELD,
        { key: 'question_pay_name', label: 'Payment (name)', type: 'PAYMENT', value: 'Alice Smith' },
      ]),
    )
    // Only INPUT_TEXT name fields count — PAYMENT is ignored → name stays null.
    expect(result._unsafeUnwrap().name).toBeNull()
  })

  it('prefers an exact "campaign" hidden field over a "utm_campaign" contains-match', () => {
    const result = mapTallyPayload(
      payload([
        { key: 'q_utm', label: 'utm_campaign', type: 'HIDDEN_FIELDS', value: 'wrong' },
        { key: 'q_c', label: 'campaign', type: 'HIDDEN_FIELDS', value: 'kacper' },
        EMAIL_FIELD,
      ]),
    )
    expect(result._unsafeUnwrap().campaignSlug).toBe('kacper')
  })

  it('consent = true when the aggregate selection array is non-empty', () => {
    const result = mapTallyPayload(payload([CAMPAIGN_HIDDEN, EMAIL_FIELD, ...consentBlock(true)]))
    expect(result._unsafeUnwrap().consentLaunch).toBe(true)
  })

  it('consent = false when the aggregate array is empty and per-option rows are false', () => {
    const result = mapTallyPayload(payload([CAMPAIGN_HIDDEN, EMAIL_FIELD, ...consentBlock(false)]))
    expect(result._unsafeUnwrap().consentLaunch).toBe(false)
  })

  it('consent = true via the per-option boolean fallback when the aggregate array is empty', () => {
    // Defensive path: aggregate reports [] but a per-option boolean row is true.
    const OPT = 'opt-consent-1'
    const result = mapTallyPayload(
      payload([
        CAMPAIGN_HIDDEN,
        EMAIL_FIELD,
        { key: 'question_consent', label: 'Zgoda', type: 'CHECKBOXES', value: [] },
        { key: `question_consent_${OPT}`, label: 'Zgoda (Tak)', type: 'CHECKBOXES', value: true },
      ]),
    )
    expect(result._unsafeUnwrap().consentLaunch).toBe(true)
  })

  it('consent = false when there is no checkboxes field at all', () => {
    const result = mapTallyPayload(payload([CAMPAIGN_HIDDEN, EMAIL_FIELD]))
    expect(result._unsafeUnwrap().consentLaunch).toBe(false)
  })

  it('leaves optional name + source null when absent', () => {
    const lead = mapTallyPayload(payload([CAMPAIGN_HIDDEN, EMAIL_FIELD]))._unsafeUnwrap()
    expect(lead.name).toBeNull()
    expect(lead.source).toBeNull()
  })

  it('errors with missing_campaign when the campaign hidden field is absent', () => {
    const result = mapTallyPayload(payload([EMAIL_FIELD]))
    expect(result._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.missingCampaign)
  })

  it('errors with missing_email when no email field can be found', () => {
    const result = mapTallyPayload(payload([CAMPAIGN_HIDDEN, NAME_FIELD]))
    expect(result._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.missingEmail)
  })

  it('errors with bad_payload for a non-FORM_RESPONSE shape', () => {
    expect(mapTallyPayload(null)._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.badPayload)
    expect(mapTallyPayload({})._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.badPayload)
    expect(mapTallyPayload({ data: { fields: 'nope' } })._unsafeUnwrapErr()).toBe(
      TALLY_MAP_ERRORS.badPayload,
    )
  })

  it('errors with bad_payload when eventType is not FORM_RESPONSE', () => {
    // A well-formed data.fields array is not enough — a non-form event (edit,
    // delete, etc.) must be rejected so it never produces a phantom lead.
    const result = mapTallyPayload({
      eventId: 'evt_1',
      eventType: 'FORM_EDITED',
      createdAt: '2026-07-08T10:00:00Z',
      data: { submissionId: 'sub_abc', responseId: 'res_abc', fields: [CAMPAIGN_HIDDEN, EMAIL_FIELD] },
    })
    expect(result._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.badPayload)
  })

  it('errors with missing_submission_id when submissionId is absent or empty', () => {
    // Dedup keys on submissionId; without it a resend would re-insert (DB UNIQUE
    // allows multiple NULLs). Reject rather than write a non-deduplicable lead.
    const absent = mapTallyPayload({
      eventId: 'evt_1',
      eventType: 'FORM_RESPONSE',
      createdAt: '2026-07-08T10:00:00Z',
      data: { responseId: 'res_abc', fields: [CAMPAIGN_HIDDEN, EMAIL_FIELD] },
    })
    expect(absent._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.missingSubmissionId)

    const empty = mapTallyPayload(payload([CAMPAIGN_HIDDEN, EMAIL_FIELD], '   '))
    expect(empty._unsafeUnwrapErr()).toBe(TALLY_MAP_ERRORS.missingSubmissionId)
  })
})

describe('mapTallyPayload — real Tally fixture', () => {
  it('does not choke on the full field-type zoo and picks only the needed fields', () => {
    const result = mapTallyPayload(sampleWebhook)

    expect(result.isOk()).toBe(true)
    const lead = result._unsafeUnwrap()
    // Sample hidden field is `utm_campaign` (illustration) — the contains-match
    // resolves it; the value is the campaign slug.
    expect(lead.campaignSlug).toBe('newsletter')
    expect(lead.email).toBe('alice@example.com')
    expect(lead.submissionId).toBe('2wgx4n')
    // The sample's only CHECKBOXES aggregate has 2 selected → consent true.
    expect(lead.consentLaunch).toBe(true)
    // No INPUT_TEXT labelled name, no `source` hidden field.
    expect(lead.name).toBeNull()
    expect(lead.source).toBeNull()
  })
})
