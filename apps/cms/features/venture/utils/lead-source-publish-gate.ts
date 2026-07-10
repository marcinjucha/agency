import {
  evaluatePublishGate,
  type PublishGateResult,
} from '../lead-sources/specs'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — UI-side publish gate (iter 2b).
//
// Pure, client-safe bridge between the editor's FORM state and the shared
// server-side publish rule (evaluatePublishGate in lead-sources/specs.ts). The
// server stays the source of truth; this only mirrors the rule so the editor can
// disable the Publish affordance + show the matching hint.
//
// The one piece of real logic here — WHY it's extracted + tested — is the
// `hasSecret` derivation: a required `secret` field is satisfied EITHER by a
// secret already persisted on the row (has_webhook_secret) OR by a secret the
// operator has just typed but not yet saved. The save writes the typed secret in
// the SAME request, so gating a first-time publish-with-secret on the persisted
// flag alone would wrongly block it.
// ---------------------------------------------------------------------------

export interface EditorPublishGateInput {
  /** Selected provider id, or null/undefined for a draft (no source). */
  provider: string | null | undefined
  /** Dedicated secret column already set on the persisted row (has_webhook_secret). */
  secretAlreadySet: boolean
  /** Secret the operator typed in the current (unsaved) editing session. */
  secretInput: string | null | undefined
  /** Non-secret provider config (so_campaigns.lead_source_config JSONB). */
  config: Record<string, unknown> | null | undefined
}

export function evaluateEditorPublishGate(
  input: EditorPublishGateInput,
): PublishGateResult {
  const hasSecret = input.secretAlreadySet || !!input.secretInput?.trim()
  return evaluatePublishGate({
    provider: input.provider ?? null,
    hasSecret,
    config: input.config ?? {},
  })
}
