import type { Json } from '@agency/database'
import type { Block } from '@agency/email'
import { brandToThemeTokens, resolveClientTheme, type ResolvedTheme } from '@/lib/theme'
import { fetchThemeTokens } from '@/lib/theme/fetch.server'
import { buildBonusEmail, resolveBonusBrand, type BonusEmail } from './bonus-email'
import { buildBonusEmailFromTemplateHtml } from './bonus-email-template'
import { isUsableTemplateBlocks } from '../utils/template-blocks'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — SHARED render mechanism (Phase 4, preview increment).
//
// The SEND path (ingest.server.ts `sendBonusEmail`, service-role client) and the
// campaign editor's "Podgląd e-mail" preview (admin-handlers.server.ts, cookie
// client) MUST produce the BYTE-IDENTICAL bonus email for the same inputs — the
// whole point of the preview is to show the REAL mail. This module is the ONE
// place both call for (a) per-tier theme resolution and (b) copy-template vs
// hardcoded-builder selection, so the two paths cannot drift.
//
// Every function here takes the Supabase client STRUCTURALLY (`from(table)`) so
// it runs unchanged under BOTH the service-role client (ingest) and the
// cookie/RLS client (preview) — no lib → app coupling, same seam as
// fetchThemeTokens. All reads degrade (never throw): a missing theme → neutral
// default, a broken template → hardcoded builder — the send's no-drop contract.
// ---------------------------------------------------------------------------

// Minimal structural client surface (matches ThemeFetchClient in fetch.server).
type ThemeFetchClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

/** The resolvable bonus-email copy template: editable copy blocks + subject. */
export type BonusTemplateRow = { blocks: Block[]; subject: string }

/**
 * The three brand-theme tiers a bonus send resolves over (most- to least-
 * specific): campaign → client → tenant. Each is a (named-theme FK, inline
 * JSONB fallback) pair; the campaign tier's inline fallback is the legacy
 * `so_campaigns.brand` blob adapted via `brandToThemeTokens`.
 */
export interface BonusThemeTiers {
  tenantThemeId: string | null
  tenantTheme: Json | null
  clientThemeId: string | null
  clientTheme: Json | null
  campaignThemeId: string | null
  campaignBrand: Json | null
}

/**
 * Coerce a raw `email_templates` row into a usable BonusTemplateRow, or null when
 * unusable. `blocks` is JSONB → a non-array or empty blob is treated as ABSENT
 * (no-drop: an unusable template must fall through to the next tier / builder,
 * never render broken copy). Pure. Shared by the send path and the effective-send
 * card so the card can never name a template the send would skip.
 */
export function coerceBonusTemplateRow(data: unknown): BonusTemplateRow | null {
  if (!data) return null
  const row = data as { blocks: unknown; subject: string | null }
  if (!isUsableTemplateBlocks(row.blocks)) return null
  return { blocks: row.blocks as Block[], subject: row.subject ?? '' }
}

/**
 * Resolve the fully-populated `ResolvedTheme` for a bonus send: per tier, turn
 * the named-theme FK into tokens (falling back to the inline JSONB), then resolve
 * campaign-over-client-over-tenant with the neutral Halo Efekt default backfilling
 * any absent token. The three tier reads fire concurrently. Never throws.
 *
 * IDENTICAL logic to the pre-extraction inline block in `sendBonusEmail` — this
 * is now the ONE definition the send AND the preview both call.
 */
export async function resolveVentureSendTheme(
  supabase: ThemeFetchClient,
  tiers: BonusThemeTiers,
): Promise<ResolvedTheme> {
  const [tenantTheme, clientTheme, campaignTheme] = await Promise.all([
    fetchThemeTokens(supabase, tiers.tenantThemeId, tiers.tenantTheme),
    fetchThemeTokens(supabase, tiers.clientThemeId, tiers.clientTheme),
    fetchThemeTokens(
      supabase,
      tiers.campaignThemeId,
      brandToThemeTokens(tiers.campaignBrand) as unknown as Json,
    ),
  ])
  return resolveClientTheme({ tenantTheme, clientTheme, campaignTheme })
}

/**
 * Build subject + HTML for the bonus email. HYBRID: when a `venture_bonus`-style
 * template exists, render the editable copy from it + splice the programmatic
 * bonus list; on ANY error building from it, fall back to the hardcoded builder.
 * When absent, use the hardcoded builder directly. Either way the dynamic list
 * (0 / 1 / many, no cap) and the resolved theme are identical.
 *
 * Takes `displayName` (not the whole campaign row) so the preview handler — which
 * reads campaigns via the authenticated/cookie client — can call it without the
 * ingest CampaignRow shape. `resolveBonusBrand(displayName)` is the exact
 * `{{companyName}}` value both paths substitute.
 */
export async function buildBonusEmailBody(
  template: BonusTemplateRow | null,
  displayName: string | null,
  bonuses: Array<{ title: string | null; url: string | null }>,
  theme: ResolvedTheme,
): Promise<BonusEmail> {
  if (template) {
    try {
      return await buildBonusEmailFromTemplateHtml({
        templateBlocks: template.blocks,
        subjectTemplate: template.subject,
        bonuses,
        theme,
        values: { companyName: resolveBonusBrand(displayName) },
      })
    } catch (error) {
      // A broken/edited template must NEVER degrade a live send — fall through.
      console.error(
        '[venture] bonus template render failed — falling back to hardcoded builder:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }
  return buildBonusEmail({ campaignDisplayName: displayName, bonuses, theme })
}
