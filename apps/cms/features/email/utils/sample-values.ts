import { APP_SENT_VARIABLE_SOURCES } from '@/lib/app-sent-variables'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// Sample-data preview values — the "Dane przykładowe" toggle in the email editor.
//
// Council 2026-07-14: fill ONLY code-known tokens. For an APP-OWNED template
// type (the CMS builds the values object), that means the `app` scalars
// (companyName → "Twoja Firma"). EVERYTHING else — workflow/unresolvable/custom
// tokens — is deliberately OMITTED from the record so the shared substitution
// primitives leave it BRACKETED (`{{token}}`). The honest "won't be filled"
// signal must survive; never fabricate a value for a token the system cannot resolve.
//
// Display-only: the caller applies these to a COPY of the blocks/subject; the
// stored template (html_body / blocks) is never touched.
// ---------------------------------------------------------------------------

// Sample text per app-supplied scalar key. Keyed by the `appKeys` entries in
// APP_SENT_VARIABLE_SOURCES (single source of truth for which tokens are filled).
const APP_KEY_SAMPLE: Record<string, string> = {
  companyName: messages.email.sampleCompanyName,
}

/**
 * Build the sample substitution record for a template type. Non-empty ONLY for
 * APP-OWNED types; returns `{}` for workflow/custom types (nothing code-known to
 * fill → every token stays bracketed).
 */
export function buildSampleValues(templateType: string): Record<string, string> {
  const source =
    APP_SENT_VARIABLE_SOURCES[templateType as keyof typeof APP_SENT_VARIABLE_SOURCES]
  if (!source) return {}

  const values: Record<string, string> = {}
  for (const key of source.appKeys) {
    const sample = APP_KEY_SAMPLE[key]
    if (sample) values[key] = sample
  }
  return values
}
