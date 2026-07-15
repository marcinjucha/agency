import {
  renderEmailBlocks,
  substituteTokens,
  substitutePlain,
  sanitizeHtmlUrls,
  type Block,
  type ThemeColorMap,
} from '@agency/email'
import type { ResolvedTheme } from '@/lib/theme'
import type { VentureBonusAppKey } from '@/lib/app-sent-variables'
import type { BonusEmail } from './bonus-email'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — themed template builder (Phase 3 → Iter 4b).
//
// The bonus email's copy (header / heading / intro / CTA / footer) lives as an
// editable, themed `email_templates` row. The template path renders the authored
// blocks AS-IS — there is NO programmatic bonus-list injection here anymore. As
// of Iter 3 the bonus links are supplied through per-campaign template variables
// (so_campaigns.template_variable_values), so the operator places a `{{token}}`
// wherever a link belongs; the marker-splice mechanism was removed in Iter 4b.
// A LEGACY template still carrying a literal `{{bonus_list}}` text block now
// leaves that token unresolved → it is stripped by `stripResidualTokens` (the
// intended migration — no special-casing). The PROGRAMMATIC list survives ONLY
// on the hardcoded fallback builder (`bonus-email.ts`), the no-template path.
//
// Two disjoint, sequenced namespaces (docs/EMAIL_TEMPLATE_ARCHITECTURE.md):
//   1. THEME — resolved campaign→client→tenant per send (client-theming, iter E2)
//      and applied here as inline literal hex by block role. The template's own
//      `theme_id` (Phase-1 per-template theme) is DELIBERATELY IGNORED on the
//      venture path: the dynamically-resolved per-campaign theme must win so
//      client-theming is preserved with zero regression.
//   2. COPY VARIABLES — scalar `{{companyName}}` + per-campaign literals,
//      substituted at SEND on the rendered HTML via `substituteTokens`
//      (escape-first, n8n-parity).
//
// PURE + I/O-free (`buildBonusEmailFromTemplate`) for unit tests; the async
// wrapper (`buildBonusEmailFromTemplateHtml`) adds render + substitution. The DB
// read + presence-based fallback to the hardcoded builder live in
// `ingest.server.ts` (`sendBonusEmail`) — a missing/broken template must NEVER
// fail or degrade a live lead send.
// ---------------------------------------------------------------------------

/**
 * Copy variables the surrounding blocks may reference. Derived from the canonical
 * app-sent registry (`APP_SENT_VARIABLE_SOURCES.venture_bonus.appKeys`) so the
 * SEND path and the editor's resolvability check cannot drift on key names.
 */
export type BonusTemplateValues = Record<VentureBonusAppKey, string>

export interface BonusTemplateInput {
  /** The copy blocks from `email_templates.blocks` (JSONB) — themeless + tokenised. */
  templateBlocks: Block[]
  theme: ResolvedTheme
}

/**
 * NO-LEAK backstop (INV-3). `venture_bonus` is APP-OWNED: the send path fills
 * exactly the app keys (`companyName`) plus the per-campaign template variables.
 * Therefore any `{{token}}` still present in the FINAL HTML after substitution is
 * GUARANTEED unfillable — a stray author token, a mis-bound key, or a legacy
 * `{{bonus_list}}` marker (no longer spliced; left unresolved by design) — and
 * must NOT reach the recipient (a seeded literal `{{firstName}}` once leaked into
 * a live send, 2026-07-14). Strip every residual `{{ token }}`, plus a now-empty
 * wrapping `<p>`. Pure.
 *
 * This is app-owned-path behaviour ONLY (deliberately UNLIKE the n8n-sent path,
 * where an unresolved token stays literal so a mis-binding is detectable): here
 * resolvability is code-knowable, so an unresolved token is always a defect.
 *
 * No-op for copy whose tokens are all filled (e.g. `{{companyName}}`) and which
 * carries no legacy marker → zero residual tokens → nothing to strip.
 */
function stripResidualTokens(html: string): string {
  return html
    .replace(/<p>\s*\{\{\s*[\w.]+\s*\}\}\s*<\/p>/g, '')
    .replace(/\{\{\s*[\w.]+\s*\}\}/g, '')
}

/**
 * Overlay the resolved theme onto a copy block by ROLE — mirrors the inline
 * mapping in `buildBonusEmailBlocks` (header bg/text, heading primary, body
 * text, footer). Non-copy block types pass through untouched. Applied per send
 * so the dynamically-resolved per-campaign theme colours the editable copy.
 */
function applyThemeToCopyBlock(block: Block, theme: ResolvedTheme): Block {
  switch (block.type) {
    case 'header':
      return { ...block, backgroundColor: theme.headerBackground, textColor: theme.headerText }
    case 'heading':
      return { ...block, color: theme.primary, textColor: theme.primary }
    case 'text':
      return { ...block, textColor: theme.text }
    case 'footer':
      return { ...block, textColor: theme.footerText }
    case 'section':
      // Rekurencja w dzieci sekcji — kopia w karcie/sekcji ma być tematyzowana
      // tak samo jak na najwyższym poziomie. ADDITIVE: sekcje są nowe (Iter 1),
      // żaden istniejący szablon ich nie ma → wyjście dla istniejących szablonów
      // bajt-w-bajt identyczne. Dzieci columns celowo NIETKNIĘTE (zachowanie
      // sprzed sekcji — zmiana zmieniłaby dostarczane maile istniejących szablonów).
      return {
        ...block,
        children: block.children.map(
          (child) => applyThemeToCopyBlock(child, theme) as (typeof block.children)[number],
        ),
      }
    default:
      return block
  }
}

/**
 * PURE — theme the authored copy blocks by role, AS-IS (no bonus-list splice; the
 * bonus links come from per-campaign template variables now). No I/O, no token
 * substitution (that happens on the rendered HTML). Returns the final `Block[]`.
 */
export function buildBonusEmailFromTemplate(input: BonusTemplateInput): Block[] {
  return input.templateBlocks.map((b) => applyThemeToCopyBlock(b, input.theme))
}

/**
 * Plaintext `{{token}}` substitution for the SUBJECT. Delegates to the shared
 * `substitutePlain` primitive (@agency/email) — deliberately NOT
 * `substituteTokens` (which HTML-escapes for body context and would
 * double-encode a plaintext subject — see docs Layer 4). `substitutePlain`
 * shares its `{{token}}` regex with `substituteTokens`, so the subject and body
 * paths cannot drift on the token grammar. Missing key left literal.
 */
function substituteSubject(subject: string, values: Record<string, string>): string {
  return substitutePlain(subject, values)
}

/**
 * Drop empty-string entries from a per-campaign value map (Iter 3c). WHY: the
 * merged substitution map is `{ ...appAuto, ...nonEmpty(templateValues) }` — an
 * EMPTY campaign value for a key that app-auto fills (e.g. `companyName`) must
 * NOT clobber the resolved app value with a blank. Only non-empty overrides win;
 * an absent/blank campaign value falls back to the app-auto value. Pure.
 */
function nonEmpty(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== '') out[key] = value
  }
  return out
}

export interface BonusTemplateRenderInput extends BonusTemplateInput {
  subjectTemplate: string
  /**
   * The app-auto values the CMS send path always supplies (currently
   * `{ companyName }`). The base of the substitution map — overridden per-key by
   * non-empty `templateValues`.
   */
  values: BonusTemplateValues
  /**
   * Per-campaign literal variable values (Iter 3c;
   * `so_campaigns.template_variable_values`). MERGED OVER `values` with empty
   * entries dropped, so an empty campaign value never clobbers an app-auto one.
   * Defaults to `{}` — omitting it keeps the seeded no-variable render
   * BYTE-IDENTICAL to the pre-3c output.
   */
  templateValues?: Record<string, string>
}

/**
 * Build subject + rendered HTML from the stored template. Renders the themed
 * authored blocks AS-IS, then substitutes copy `{{tokens}}` on the HTML
 * (escape-first, n8n-parity). Subject uses plaintext substitution.
 *
 * Escaping note: a runtime brand containing `'` or `"` is substituted HERE via
 * `substituteTokens` (escapeHtml → `'`=`&#39;`), semantically equivalent to (but
 * not byte-identical with) the hardcoded builder's React-JSX escaping
 * (`'`=`&#x27;`). Both ESCAPE the quote — no raw quote can break an attribute.
 */
export async function buildBonusEmailFromTemplateHtml(
  input: BonusTemplateRenderInput,
): Promise<BonusEmail> {
  const blocks = buildBonusEmailFromTemplate(input)
  // Build the renderer's ThemeColorMap from the resolved theme (SAME spread the
  // email editor's `resolveEmailThemeMap` uses — a ResolvedTheme's 9 colour tokens
  // are exactly the map's token keys; logoUrl/fontFamily are inert extras). Passing
  // it lets TOKEN-BOUND blocks (`textColorToken`/`backgroundColorToken`, e.g. a CTA
  // with backgroundColorToken='accent') resolve to the per-campaign brand instead
  // of the block default — the editor preview already does this via its map, and
  // the send must match. `applyThemeToCopyBlock`'s raw hex (rung b) still WINS over
  // the map (rung c) for header/heading/text/footer, so those are unchanged and the
  // seeded raw-hex/token-free venture_bonus template stays BYTE-IDENTICAL.
  const themeMap: ThemeColorMap = { ...input.theme }
  const rendered = await renderEmailBlocks(blocks, themeMap)
  // Iter 3c precedence: app-auto values (companyName) as the BASE, per-campaign
  // literal values merged OVER them with empty entries dropped (nonEmpty) — so a
  // campaign override wins for any key it fills, but a blank campaign value never
  // clobbers the resolved app-auto value. Empty/absent templateValues → merged
  // map == input.values → the seeded no-variable render stays BYTE-IDENTICAL.
  // The SAME merged map feeds BOTH the HTML body AND the subject, so a subject
  // token like {{firstName}} resolves from the campaign values too.
  const values: Record<string, string> = {
    ...(input.values as unknown as Record<string, string>),
    ...nonEmpty(input.templateValues ?? {}),
  }
  const substituted = substituteTokens(rendered, values)
  // Belt-and-suspenders: scheme-guard every href/src in the FINAL HTML. An
  // editable copy-template block (or a per-campaign variable value) could carry a
  // dangerous href that blind token substitution can't see — sanitize the whole
  // rendered body. No-op when no dangerous scheme is present.
  const sanitized = sanitizeHtmlUrls(substituted)
  // NO-LEAK backstop (INV-3): AFTER substitution, strip any residual `{{token}}`.
  // Runs on the final HTML so it also strips a legacy `{{bonus_list}}` marker (no
  // longer spliced — left unresolved by design). No-op when every token is filled.
  const html = stripResidualTokens(sanitized)
  const subject = substituteSubject(input.subjectTemplate, values)
  return { subject, html }
}
