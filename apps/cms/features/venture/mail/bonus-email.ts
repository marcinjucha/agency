import { renderEmailBlocks, escapeHtml, type Block } from '@agency/email'
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

const FALLBACK_BRAND = 'Halo Efekt'
const BONUS_LINK_LABEL = 'Zrób kopię' // TODO(OQ-5): final PL copy

/** Only bonuses with a usable link can be delivered. */
function deliverableBonuses(bonuses: BonusEmailBonus[]): Array<{ title: string; url: string }> {
  return bonuses
    .filter((b): b is { title: string | null; url: string } => Boolean(b.url))
    .map((b) => ({ title: b.title?.trim() || 'Bonus', url: b.url }))
}

/** PLACEHOLDER PL subject. TODO(OQ-5): final copy from Marcin. */
export function buildBonusEmailSubject(input: BonusEmailInput): string {
  const brand = input.campaignDisplayName?.trim() || FALLBACK_BRAND
  return `Twoje bonusy od ${brand}`
}

/**
 * Build the email block list. PURE — no async, no @react-email. Renders each
 * deliverable bonus as its own line with a "Zrób kopię" link, plus a
 * "sprawdź skrzynkę" note. PLACEHOLDER PL copy — TODO(OQ-5).
 */
export function buildBonusEmailBlocks(input: BonusEmailInput): Block[] {
  const brand = input.campaignDisplayName?.trim() || FALLBACK_BRAND
  const bonuses = deliverableBonuses(input.bonuses)
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

  const bonusListHtml =
    bonuses.length > 0
      ? bonuses
          .map(
            (b) =>
              `<p><strong>${escapeHtml(b.title)}</strong> — <a href="${escapeHtml(b.url)}">${BONUS_LINK_LABEL}</a></p>`,
          )
          .join('')
      : '<p>Bonusy pojawią się wkrótce.</p>' // TODO(OQ-5)

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
    {
      id: 'bonus-list',
      type: 'text',
      content: bonusListHtml,
      textColor: theme.text,
    },
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
