import { getTriggerVariables } from '@/lib/trigger-schemas'
import { APP_SENT_VARIABLE_SOURCES } from '@/lib/app-sent-variables'
import { messages } from '@/lib/messages'

/**
 * Where a template `{{token}}` gets its value — for display + advisory only.
 * NO save-blocking, NO runtime/substitution change.
 *
 * CRITICAL CORRECTNESS RULE (theming council, scope/risk member): resolvability is
 * NOT editor-knowable and this classifier NEVER emits an "unresolvable" verdict.
 *   - n8n-sent templates: resolvability lives in the workflow's per-step
 *     `variable_bindings` (invisible here) and the trigger-schemas catalog DRIFTS
 *     from the real injector → every token is informational `'workflow'`.
 *   - APP-OWNED sends (venture_bonus): the CMS fills the `app` scalar
 *     (`companyName`); EVERY other token is filled PER-CAMPAIGN via
 *     `so_campaigns.template_variable_values` (Iter 3), which the editor cannot
 *     see → informational `'campaign'`, never a leak warning. Since Iter 4b the
 *     `{{bonus_list}}` marker is no longer spliced, so it is NOT `'structural'` /
 *     auto-filled either — just another per-campaign token here.
 *   - Custom/unknown slugs get a neutral `'manual'` (avoid crying wolf on user
 *     slugs).
 *
 * `kind`:
 * - `app`          — an app-supplied scalar (venture_bonus → companyName)
 * - `campaign`     — an APP-OWNED, non-app token filled PER-CAMPAIGN
 *                    (so_campaigns.template_variable_values) — informational, the
 *                    editor cannot know which campaign fills what
 * - `workflow`     — filled by the workflow sending this email (informational)
 * - `manual`       — custom template slug; the operator manages this token
 * - `structural`   — DEPRECATED (Iter 4b): the bonus-list marker is no longer
 *                    spliced. Retained only as a valid kind; NEVER emitted.
 * - `unresolvable` — DEPRECATED: no token is editor-knowably unresolvable anymore
 *                    (per-campaign fills anything). Retained as a valid kind (the
 *                    badge component still references it); NEVER emitted.
 */
export type VariableSourceKind =
  | 'app'
  | 'campaign'
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
  campaign: messages.email.varSourceCampaign,
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
    // The one scalar the app itself fills on every send. Cast to `readonly
    // string[]` so `.includes` accepts a general string (appKeys is a readonly
    // literal tuple, whose `.includes` param would otherwise be the element type).
    if ((appSource.appKeys as readonly string[]).includes(key)) return toSource('app')
    // Every other token on an app-owned venture send is filled PER-CAMPAIGN — the
    // editor can't know which campaign fills what, so it is informational, never a
    // leak warning. This INCLUDES the legacy `{{bonus_list}}` marker (no longer
    // spliced since Iter 4b → not structural / auto-filled here).
    return toSource('campaign')
  }

  // n8n / trigger-aligned type → every token is filled by the sending workflow.
  // NEVER unresolvable (bindings are invisible to the editor).
  if (getTriggerVariables(templateType).length > 0) return toSource('workflow')

  // Custom/unknown slug → neutral, no warnings.
  return toSource('manual')
}

/**
 * Content tokens that will reach the recipient LITERALLY — powered the persistent
 * inline note + save-time advisory. ALWAYS `[]` now.
 *
 * WHY always empty (Iter 3/4b): there is no longer any editor-knowable
 * "unresolvable" token. The only app-owned type (`venture_bonus`) fills
 * `companyName` from the app AND any other token PER-CAMPAIGN via
 * `so_campaigns.template_variable_values` — invisible to the editor, so it cannot
 * be asserted a leak (per the project rule: per-campaign/n8n resolvability is
 * informational-only, must NOT assert unresolvable). The `{{bonus_list}}` marker
 * is likewise no longer spliced. n8n/custom types were already never judged here.
 *
 * Signature preserved so the `EmailTemplateEditor` call site is unchanged; the
 * parameters no longer affect the result.
 */
export function collectUnresolvableTokens(
  _detectedKeys: readonly string[],
  _templateType: string,
  _manualKeys: readonly string[],
): string[] {
  return []
}
