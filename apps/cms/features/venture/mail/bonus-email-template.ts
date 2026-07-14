import { renderEmailBlocks, substituteTokens, substitutePlain, type Block } from '@agency/email'
import type { ResolvedTheme } from '@/lib/theme'
import {
  buildBonusListBlock,
  type BonusEmail,
  type BonusEmailBonus,
} from './bonus-email'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — HYBRID template builder (Phase 3).
//
// The SURROUNDING COPY of the bonus email (header / heading / intro / inbox-note
// / footer) lives as an editable, themed `email_templates` row (type slug
// `venture_bonus`). The DYNAMIC bonus LIST stays rendered PROGRAMMATICALLY from
// the campaign's published bonuses (no fixed slots, no count cap) and is spliced
// into the template's copy blocks at send.
//
// Two disjoint, sequenced namespaces (docs/EMAIL_TEMPLATE_ARCHITECTURE.md):
//   1. STRUCTURE — a marker block (`{{bonus_list}}`) pins WHERE the programmatic
//      list is spliced. Consumed by THIS builder (block replacement), NOT by
//      substituteTokens.
//   2. THEME — resolved campaign→client→tenant per send (client-theming, iter E2)
//      and applied here as inline literal hex by block role — so the template
//      render is themed IDENTICALLY to the hardcoded builder. The template's own
//      `theme_id` (Phase-1 per-template theme) is DELIBERATELY IGNORED on the
//      venture path: the dynamically-resolved per-campaign theme must win so
//      client-theming is preserved with zero regression.
//   3. COPY VARIABLES — scalar `{{companyName}}` etc., substituted at SEND on the
//      rendered HTML via `substituteTokens` (escape-first, n8n-parity).
//
// PURE + I/O-free (`buildBonusEmailFromTemplate`) for unit tests; the async
// wrapper (`buildBonusEmailFromTemplateHtml`) adds render + substitution. The DB
// read + presence-based fallback to the hardcoded builder live in
// `ingest.server.ts` (`sendBonusEmail`) — a missing/broken template must NEVER
// fail or degrade a live lead send.
// ---------------------------------------------------------------------------

/**
 * The structural marker. A `text` block whose trimmed `content` equals this
 * token marks the exact splice position for the programmatic bonus list. Pins
 * the position regardless of surrounding-block reordering; survives edits in the
 * Phase-1 editor (it's an ordinary text block — no venture-specific block type).
 */
export const BONUS_LIST_MARKER = '{{bonus_list}}'

/** Copy variables the surrounding blocks may reference. */
export interface BonusTemplateValues {
  companyName: string
}

export interface BonusTemplateInput {
  /** The copy blocks from `email_templates.blocks` (JSONB) — themeless + tokenised. */
  templateBlocks: Block[]
  bonuses: BonusEmailBonus[]
  theme: ResolvedTheme
}

function isMarkerBlock(block: Block): boolean {
  return block.type === 'text' && block.content.trim() === BONUS_LIST_MARKER
}

/**
 * Belt-and-suspenders: strip any RESIDUAL literal `{{bonus_list}}` from the
 * rendered HTML. The marker is recognised as a splice point ONLY when it is a
 * STANDALONE text block (`isMarkerBlock`). If an author mis-formats it inside
 * content (e.g. `<p>{{bonus_list}}</p>`), the programmatic list is still safely
 * appended before-footer (never dropped), but the literal token would otherwise
 * survive into the sent HTML and reach the recipient. Remove any leftover
 * occurrence — and a now-empty wrapping `<p>` if trivial — so it never leaks.
 * Pure.
 */
function stripResidualBonusMarker(html: string): string {
  const marker = BONUS_LIST_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html
    .replace(new RegExp(`<p>\\s*${marker}\\s*</p>`, 'g'), '')
    .replace(new RegExp(marker, 'g'), '')
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
    default:
      return block
  }
}

/**
 * Splice the programmatic list into the copy blocks. The list REPLACES the
 * marker block in place (exact position). If the author removed the marker, the
 * list is inserted before the first `footer` block, else appended — so the list
 * is NEVER dropped whatever the author did to the template.
 */
function spliceBonusList(blocks: Block[], listBlock: Block): Block[] {
  const markerIndex = blocks.findIndex(isMarkerBlock)
  if (markerIndex !== -1) {
    return [...blocks.slice(0, markerIndex), listBlock, ...blocks.slice(markerIndex + 1)]
  }
  const footerIndex = blocks.findIndex((b) => b.type === 'footer')
  if (footerIndex !== -1) {
    return [...blocks.slice(0, footerIndex), listBlock, ...blocks.slice(footerIndex)]
  }
  return [...blocks, listBlock]
}

/**
 * PURE — theme the copy blocks + splice the programmatic list. No I/O, no token
 * substitution (that happens on the rendered HTML). Returns the final `Block[]`.
 */
export function buildBonusEmailFromTemplate(input: BonusTemplateInput): Block[] {
  const listBlock = buildBonusListBlock(input.bonuses, input.theme)
  const themed = input.templateBlocks.map((b) => applyThemeToCopyBlock(b, input.theme))
  return spliceBonusList(themed, listBlock)
}

/**
 * Plaintext `{{token}}` substitution for the SUBJECT. Delegates to the shared
 * `substitutePlain` primitive (@agency/email) — deliberately NOT
 * `substituteTokens` (which HTML-escapes for body context and would
 * double-encode a plaintext subject — see docs Layer 4). `substitutePlain`
 * shares its `{{token}}` regex with `substituteTokens`, so the subject and body
 * paths cannot drift on the token grammar. Missing key left literal.
 */
function substituteSubject(subject: string, values: BonusTemplateValues): string {
  return substitutePlain(subject, values as unknown as Record<string, string>)
}

export interface BonusTemplateRenderInput extends BonusTemplateInput {
  subjectTemplate: string
  values: BonusTemplateValues
}

/**
 * Build subject + rendered HTML from the stored template. Renders the themed,
 * list-spliced blocks, then substitutes copy `{{tokens}}` on the HTML
 * (escape-first, n8n-parity). Subject uses plaintext substitution.
 *
 * BYTE-IDENTICAL scope (regression guard): the hybrid render equals the
 * hardcoded builder BYTE-FOR-BYTE only for the seeded static copy, whose brand
 * fixture ("Kacper Launch") has no ' or ". A runtime brand containing ' or " is
 * substituted HERE via `substituteTokens` (escapeHtml → `'`=`&#39;`) whereas the
 * hardcoded builder emits the brand through React JSX (`'`=`&#x27;`). Both ESCAPE
 * the quote (semantically equivalent — no raw quote can break an attribute), but
 * the entity FORM differs, so those cases are asserted for semantic equivalence,
 * not byte equality.
 */
export async function buildBonusEmailFromTemplateHtml(
  input: BonusTemplateRenderInput,
): Promise<BonusEmail> {
  const blocks = buildBonusEmailFromTemplate(input)
  const rendered = stripResidualBonusMarker(await renderEmailBlocks(blocks))
  const html = substituteTokens(rendered, input.values as unknown as Record<string, string>)
  const subject = substituteSubject(input.subjectTemplate, input.values)
  return { subject, html }
}
