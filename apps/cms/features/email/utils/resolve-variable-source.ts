import { getTriggerVariables } from '@/lib/trigger-schemas'
import { APP_SENT_VARIABLE_SOURCES } from '@/lib/app-sent-variables'
import { messages } from '@/lib/messages'

/**
 * Where a template `{{token}}` gets its value — for display + advisory only.
 * NO save-blocking, NO runtime/substitution change.
 *
 * CRITICAL CORRECTNESS RULE (theming council, scope/risk member): a per-token
 * "unresolvable" verdict is ONLY code-knowable for APP-OWNED sends (the CMS
 * builds the values object). For n8n-sent templates, resolvability lives in the
 * workflow's per-step `variable_bindings` (invisible here) and the trigger-schemas
 * catalog DRIFTS from the real injector — so we NEVER emit "unresolvable" for
 * n8n/trigger-aligned types; every token there is informational `'workflow'`.
 * Custom/unknown slugs get a neutral `'manual'` with no warning (avoid crying
 * wolf on user slugs).
 *
 * `kind`:
 * - `app`          — an app-supplied scalar (venture_bonus → companyName)
 * - `structural`   — the bonus-list marker; a block is spliced in at send
 * - `workflow`     — filled by the workflow sending this email (informational)
 * - `manual`       — custom template slug; the operator manages this token
 * - `unresolvable` — APP-OWNED type, token is neither app-supplied nor the marker
 *                    → it will reach the recipient literally
 */
export type VariableSourceKind =
  | 'app'
  | 'structural'
  | 'workflow'
  | 'manual'
  | 'unresolvable'

export interface VariableSource {
  kind: VariableSourceKind
  label: string
}

const LABEL_BY_KIND: Record<VariableSourceKind, string> = {
  app: messages.email.varSourceApp,
  structural: messages.email.varSourceStructural,
  workflow: messages.email.varSourceWorkflow,
  manual: messages.email.varSourceManual,
  unresolvable: messages.email.varSourceUnresolvable,
}

function toSource(kind: VariableSourceKind): VariableSource {
  return { kind, label: LABEL_BY_KIND[kind] }
}

/**
 * Classify one token key for the given template type. Pure — no I/O, no messages
 * side effects beyond a static label lookup. See file header for the rule set.
 */
export function resolveVariableSource(key: string, templateType: string): VariableSource {
  const appSource = APP_SENT_VARIABLE_SOURCES[templateType as keyof typeof APP_SENT_VARIABLE_SOURCES]
  if (appSource) {
    if (appSource.appKeys.includes(key)) return toSource('app')
    if (key === appSource.markerKey) return toSource('structural')
    return toSource('unresolvable')
  }

  // n8n / trigger-aligned type → every token is filled by the sending workflow.
  // NEVER unresolvable (bindings are invisible to the editor).
  if (getTriggerVariables(templateType).length > 0) return toSource('workflow')

  // Custom/unknown slug → neutral, no warnings.
  return toSource('manual')
}

/**
 * Tokens present in the template CONTENT that will NOT be filled — the set that
 * powers the persistent inline note + the save-time advisory. Non-empty ONLY for
 * APP-OWNED template types: a content token is unresolvable when it is neither an
 * app-supplied key, nor the structural marker, nor a key the operator explicitly
 * registered (`manualKeys`). For n8n/custom types this ALWAYS returns `[]` — we
 * cannot (and must not) judge those from the editor.
 */
export function collectUnresolvableTokens(
  detectedKeys: readonly string[],
  templateType: string,
  manualKeys: readonly string[],
): string[] {
  const appSource = APP_SENT_VARIABLE_SOURCES[templateType as keyof typeof APP_SENT_VARIABLE_SOURCES]
  if (!appSource) return []

  const allowed = new Set<string>([...appSource.appKeys, appSource.markerKey, ...manualKeys])
  return detectedKeys.filter((key) => !allowed.has(key))
}
