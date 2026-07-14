/**
 * Single source of truth for APP-OWNED email variable resolvability.
 *
 * WHY here (lib/) and not in features/venture/: the email template editor
 * (features/email) needs to know which `{{tokens}}` an APP-SENT template will
 * actually fill, and the venture send path (features/venture) is the code that
 * fills them. Two features must agree on the exact key names — so the canonical
 * list lives in lib/ (features→lib is legal; lib→features is forbidden). Both
 * sides import from here → no drift.
 *
 * CRITICAL CORRECTNESS RULE (from the theming council): the "will this token be
 * filled?" judgment is ONLY code-knowable for APP-OWNED sends (where CMS code
 * builds the values object). For n8n-sent templates, resolvability lives in the
 * workflow's per-step `variable_bindings` (invisible to the editor) and the
 * trigger-schemas catalog DRIFTS from the real injector — so an app-owned entry
 * MUST be added here ONLY for template types the CMS itself sends. Never list an
 * n8n/trigger-aligned type here.
 *
 * Currently the only app-owned send is the venture bonus email (`venture_bonus`):
 * CMS builds `BonusTemplateValues` ({ companyName }) in
 * `features/venture/mail/bonus-email-template.ts` + `ingest.server.ts`, and the
 * bonus list is spliced at the `bonus_list` marker block.
 */

/** The one app-owned bonus-list marker key. `{{bonus_list}}` is derived from this. */
export const VENTURE_BONUS_MARKER_KEY = 'bonus_list'

/**
 * The braces-wrapped structural marker (`{{bonus_list}}`). Single source of truth
 * for BOTH the send-path builder (`features/venture/mail/bonus-email-template.ts`
 * re-exports it as `BONUS_LIST_MARKER`) AND the email editor's "Lista bonusów"
 * block affordance + canvas chip detection. Lives in `lib/` (not a feature) so the
 * generic email editor can consume it without importing the venture feature.
 */
export const VENTURE_BONUS_MARKER = `{{${VENTURE_BONUS_MARKER_KEY}}}`

export interface AppSentVariableSource {
  /** Scalar keys the CMS send path supplies as literal values (e.g. companyName). */
  readonly appKeys: readonly string[]
  /** The structural marker key — replaced by a programmatically-built block at send. */
  readonly markerKey: string
}

export const APP_SENT_VARIABLE_SOURCES = {
  venture_bonus: {
    appKeys: ['companyName'],
    markerKey: VENTURE_BONUS_MARKER_KEY,
  },
} as const satisfies Record<string, AppSentVariableSource>

/** Template-type slugs that the CMS itself sends (app-owned). Derived — do not hand-maintain. */
export type AppSentTemplateType = keyof typeof APP_SENT_VARIABLE_SOURCES

/** The app-supplied scalar keys for the venture bonus email — derived from the registry. */
export type VentureBonusAppKey = (typeof APP_SENT_VARIABLE_SOURCES)['venture_bonus']['appKeys'][number]
