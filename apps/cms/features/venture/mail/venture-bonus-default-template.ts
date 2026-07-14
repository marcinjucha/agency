import type { Block } from '@agency/email'
import { VENTURE_BONUS_MARKER_KEY, type VentureBonusAppKey } from '@/lib/app-sent-variables'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — the canonical DEFAULT copy for a NEW `venture_bonus`
// email template (Phase 4, increment 2).
//
// SINGLE SOURCE (app side) for what `createVentureTemplateHandler` seeds into a
// freshly-created library template. Reproduces the copy shipped by the DB seed
// migration `20260714120000_seed_venture_bonus_email_template.sql` VERBATIM — the
// two must agree so a template created in the CMS matches the migration-seeded
// default. Kept as a pure, I/O-free module so it is unit-testable (the "blocks
// include the {{bonus_list}} marker + {{companyName}}" drift guard reads it
// directly) and importable from both the handler and tests.
//
// INVARIANTS (locked, expensive to reverse):
//   - The header/heading/footer copy references `{{companyName}}` — the ONE
//     app-owned scalar the venture send path fills (APP_SENT_VARIABLE_SOURCES
//     .venture_bonus.appKeys). NEVER `{{firstName}}` (filled by nothing → a
//     guaranteed literal leak at send; the seed bug fixed 2026-07-14).
//   - A `text` block whose content is EXACTLY `{{bonus_list}}` (the structural
//     marker, derived from VENTURE_BONUS_MARKER_KEY) pins where the programmatic
//     bonus list is spliced at send (isMarkerBlock in bonus-email-template.ts).
//   - The `heading` block carries an explicit `color` — the email block registry
//     requires it (dropping it makes the template unsaveable in the CMS editor;
//     regression Bug A, 2026-07-14).
// ---------------------------------------------------------------------------

/** The one app-owned copy variable. `{{companyName}}` is filled at send. */
const COMPANY_NAME_TOKEN = `{{${'companyName' satisfies VentureBonusAppKey}}}`

/** The structural marker block content — spliced out into the programmatic list. */
const BONUS_LIST_MARKER = `{{${VENTURE_BONUS_MARKER_KEY}}}`

/**
 * Default subject for a new venture_bonus template. Uses the app-owned
 * `{{companyName}}` (always filled) — NEVER `{{firstName}}`.
 */
export const VENTURE_BONUS_DEFAULT_SUBJECT = `Twoje bonusy od ${COMPANY_NAME_TOKEN}`

/**
 * Default copy blocks for a new venture_bonus template — themeless (theme is
 * resolved per-campaign and applied at send, NOT baked here). Mirrors the DB
 * seed migration verbatim.
 */
export const VENTURE_BONUS_DEFAULT_BLOCKS: Block[] = [
  {
    id: 'bonus-header',
    type: 'header',
    companyName: COMPANY_NAME_TOKEN,
    textColor: '#ffffff',
  },
  {
    id: 'bonus-heading',
    type: 'heading',
    text: 'Twoje bonusy są gotowe',
    level: 'h2',
    // Required by the block registry — see Bug A regression note above.
    color: '#1a1a2e',
  },
  {
    id: 'bonus-intro',
    type: 'text',
    content:
      '<p>Dziękujemy! Poniżej znajdziesz materiały, które dla Ciebie przygotowaliśmy.</p>',
  },
  // STRUCTURAL marker — content is EXACTLY the marker token (no wrapping <p>), so
  // isMarkerBlock matches and the programmatic bonus list replaces it in place.
  {
    id: 'bonus-list-marker',
    type: 'text',
    content: BONUS_LIST_MARKER,
  },
  {
    id: 'bonus-inbox-note',
    type: 'text',
    content:
      '<p>Sprawdź swoją skrzynkę — wkrótce odezwiemy się z informacją o starcie.</p>',
  },
  {
    id: 'bonus-footer',
    type: 'footer',
    text: `Wiadomość wysłana automatycznie przez ${COMPANY_NAME_TOKEN}. Prosimy nie odpowiadać na ten email.`,
  },
]

/**
 * Registered variables for the default template — mirrors the seed migration so
 * the editor's Zmienne tab shows the two app-owned tokens on a freshly-created
 * template.
 */
export const VENTURE_BONUS_DEFAULT_TEMPLATE_VARIABLES = [
  {
    key: 'companyName',
    label: 'Nazwa marki',
    description: 'Wyświetlana w nagłówku, tytule i stopce.',
  },
  {
    key: VENTURE_BONUS_MARKER_KEY,
    label: 'Lista bonusów',
    description: 'Wstawiana automatycznie w miejscu tego znacznika — nie edytuj ręcznie.',
  },
]
