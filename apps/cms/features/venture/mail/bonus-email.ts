import { renderEmailBlocks, escapeHtml, safeUrlValue, type Block } from '@agency/email'
import type { ResolvedTheme } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — transactional bonus email builder (iter 3).
//
// beehiiv's free tier has no Automations, so the CMS sends the bonus-delivery
// email itself (spec §7). The email is VALUE-not-sales: it hands over the
// promised bonuses as links and tells the lead to check their inbox for the
// launch list. Built from the shared @agency/email block system so it renders
// identically to the CMS email templates.
//
// The block builder (`buildBonusEmailBlocks`) is PURE + synchronous → unit
// testable without invoking @react-email. `buildBonusEmail` wraps it with the
// async renderer.
//
// TODO(OQ-5): final PL copy from Marcin — strings below are placeholders.
// ---------------------------------------------------------------------------

export interface BonusEmailBonus {
  title: string | null
  url: string | null
}

export interface BonusEmailInput {
  campaignDisplayName: string | null
  bonuses: BonusEmailBonus[]
  // Fully-resolved brand theme (client override backfilled over tenant/default by
  // `resolveClientTheme`). REQUIRED — the caller always resolves one (the resolver
  // never returns null; a missing/invalid theme degrades to HALO_EFEKT_DEFAULT).
  // Kept as a pure input so `buildBonusEmailBlocks` stays synchronous + I/O-free.
  theme: ResolvedTheme
}

export interface BonusEmail {
  subject: string
  html: string
}

export const FALLBACK_BRAND = 'Halo Efekt'
const BONUS_LINK_LABEL = 'Zrób kopię' // TODO(OQ-5): final PL copy

/**
 * The brand string shown in the header / heading / footer copy. Exported so the
 * template-driven builder (`bonus-email-template.ts`) computes the exact same
 * `{{companyName}}` value the hardcoded builder bakes inline — the two paths MUST
 * agree for the byte-identical regression guard to hold.
 */
export function resolveBonusBrand(campaignDisplayName: string | null): string {
  return campaignDisplayName?.trim() || FALLBACK_BRAND
}

/** Only bonuses with a usable link can be delivered. */
function deliverableBonuses(bonuses: BonusEmailBonus[]): Array<{ title: string; url: string }> {
  return bonuses
    .filter((b): b is { title: string | null; url: string } => Boolean(b.url))
    .map((b) => ({ title: b.title?.trim() || 'Bonus', url: b.url }))
}

/**
 * Build the DYNAMIC bonus-list block: one line per deliverable bonus with a
 * hardened `href` (`escapeHtml(safeUrlValue(...))`) + escaped title, or the
 * empty-case fallback copy when nothing is deliverable. NO count cap, NO fixed
 * slots. Shared verbatim by the hardcoded builder (below) AND the hybrid
 * template builder (`bonus-email-template.ts`) so the programmatic list is
 * IDENTICAL regardless of which surrounding copy wraps it.
 */
export function buildBonusListBlock(bonuses: BonusEmailBonus[], theme: ResolvedTheme): Block {
  const deliverable = deliverableBonuses(bonuses)
  const content =
    deliverable.length > 0
      ? deliverable
          .map(
            (b) =>
              `<p><strong>${escapeHtml(b.title)}</strong> — <a href="${escapeHtml(safeUrlValue(b.url))}">${BONUS_LINK_LABEL}</a></p>`,
          )
          .join('')
      : '<p>Bonusy pojawią się wkrótce.</p>' // TODO(OQ-5)
  return { id: 'bonus-list', type: 'text', content, textColor: theme.text }
}

/** PLACEHOLDER PL subject. TODO(OQ-5): final copy from Marcin. */
export function buildBonusEmailSubject(input: BonusEmailInput): string {
  return `Twoje bonusy od ${resolveBonusBrand(input.campaignDisplayName)}`
}

/**
 * Build the email block list. PURE — no async, no @react-email. Renders each
 * deliverable bonus as its own line with a "Zrób kopię" link, plus a
 * "sprawdź skrzynkę" note. PLACEHOLDER PL copy — TODO(OQ-5).
 */
export function buildBonusEmailBlocks(input: BonusEmailInput): Block[] {
  const brand = resolveBonusBrand(input.campaignDisplayName)
  const { theme } = input

  // Theme tokens flow as INLINE LITERAL HEX (never var()/hsl() — email clients
  // don't resolve them). Five live surfaces map 1:1 to resolved tokens: header
  // bg/text, heading (via textColor — see below), body text, footer.
  // NOTE: body-text, footer AND the heading previously carried no color the
  // renderer honoured (heading set the inert `color` field; text/footer set
  // nothing) and inherited DEFAULT_BLOCK_TYPOGRAPHY (heading '#0f172a',
  // text '#334155', footer '#94a3b8'). Setting the token explicitly is
  // byte-identical when it equals that inherited default — HALO_EFEKT_DEFAULT
  // matches all three — enforced by the regression test.

  return [
    {
      id: 'bonus-header',
      type: 'header',
      companyName: brand,
      backgroundColor: theme.headerBackground,
      textColor: theme.headerText,
    },
    {
      id: 'bonus-heading',
      type: 'heading',
      // TODO(OQ-5): final PL copy from Marcin
      text: 'Twoje bonusy są gotowe',
      level: 'h2',
      // `textColor` is what the renderer actually applies (computeTypographyStyle
      // reads `overrides.textColor ?? DEFAULT_BLOCK_TYPOGRAPHY.heading.textColor`);
      // the legacy `color` field is inert (never wins) but stays because
      // HeadingBlock types it as required. Both = theme.primary so the client's
      // brand colour reaches the heading. Byte-identical HELD: HALO_EFEKT_DEFAULT
      // .primary === '#0f172a' === the heading typography default it replaces.
      color: theme.primary,
      textColor: theme.primary,
    },
    {
      id: 'bonus-intro',
      type: 'text',
      // TODO(OQ-5): value-not-sales intro — final PL copy from Marcin
      content:
        '<p>Dziękujemy! Poniżej znajdziesz materiały, które dla Ciebie przygotowaliśmy.</p>',
      textColor: theme.text,
    },
    buildBonusListBlock(input.bonuses, theme),
    {
      id: 'bonus-inbox-note',
      type: 'text',
      // TODO(OQ-5): final PL copy from Marcin
      content:
        '<p>Sprawdź swoją skrzynkę — wkrótce odezwiemy się z informacją o starcie.</p>',
      textColor: theme.text,
    },
    {
      id: 'bonus-footer',
      type: 'footer',
      text: `Wiadomość wysłana automatycznie przez ${brand}. Prosimy nie odpowiadać na ten email.`,
      textColor: theme.footerText,
    },
  ]
}

/** Build subject + rendered HTML for the bonus-delivery email. */
export async function buildBonusEmail(input: BonusEmailInput): Promise<BonusEmail> {
  const subject = buildBonusEmailSubject(input)
  const html = await renderEmailBlocks(buildBonusEmailBlocks(input))
  return { subject, html }
}
