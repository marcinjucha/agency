import { renderEmailBlocks, type Block } from '@agency/email'

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
}

export interface BonusEmail {
  subject: string
  html: string
}

const FALLBACK_BRAND = 'Halo Efekt'
const BONUS_LINK_LABEL = 'Zrób kopię' // TODO(OQ-5): final PL copy

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff',
    },
    {
      id: 'bonus-heading',
      type: 'heading',
      // TODO(OQ-5): final PL copy from Marcin
      text: 'Twoje bonusy są gotowe',
      level: 'h2',
      color: '#1a1a2e',
    },
    {
      id: 'bonus-intro',
      type: 'text',
      // TODO(OQ-5): value-not-sales intro — final PL copy from Marcin
      content:
        '<p>Dziękujemy! Poniżej znajdziesz materiały, które dla Ciebie przygotowaliśmy.</p>',
    },
    {
      id: 'bonus-list',
      type: 'text',
      content: bonusListHtml,
    },
    {
      id: 'bonus-inbox-note',
      type: 'text',
      // TODO(OQ-5): final PL copy from Marcin
      content:
        '<p>Sprawdź swoją skrzynkę — wkrótce odezwiemy się z informacją o starcie.</p>',
    },
    {
      id: 'bonus-footer',
      type: 'footer',
      text: `Wiadomość wysłana automatycznie przez ${brand}. Prosimy nie odpowiadać na ten email.`,
    },
  ]
}

/** Build subject + rendered HTML for the bonus-delivery email. */
export async function buildBonusEmail(input: BonusEmailInput): Promise<BonusEmail> {
  const subject = buildBonusEmailSubject(input)
  const html = await renderEmailBlocks(buildBonusEmailBlocks(input))
  return { subject, html }
}
