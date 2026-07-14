import type { Tables } from '@agency/database'
import type { ThemeTokens } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Theme Manager (iter D2) — named-theme library domain types.
//
// `Theme` is the `so_themes` row with the generic `tokens: Json` narrowed to the
// domain `ThemeTokens` (9 optional hex tokens + optional logo/font) — the DB
// boundary narrowing happens in server.ts via `parseThemeTokens`. Never pass the
// raw row around; always narrow at the boundary (features/CLAUDE.md type-safety).
// ---------------------------------------------------------------------------

/** A named, reusable theme (a `so_themes` row) with tokens narrowed to the domain type. */
export type Theme = Omit<Tables<'so_themes'>, 'tokens'> & { tokens: ThemeTokens }

/**
 * Reverse-FK usage counts for a theme, powering the library's "Używany przez:
 * N klientów · M kampanii · K szablonów". All three counts are real: `clients`
 * from `so_clients.theme_id`, `campaigns` from `so_campaigns.theme_id`,
 * `emailTemplates` from `email_templates.theme_id`.
 */
export type ThemeUsage = { clients: number; campaigns: number; emailTemplates: number }

/** Library list item — a theme plus its reverse-FK usage counts. */
export type ThemeWithUsage = Theme & { usedBy: ThemeUsage }

/**
 * Delete-guard reference counts. A theme is blocked from deletion while any
 * `so_clients.theme_id`, `tenants.theme_id`, `so_campaigns.theme_id`, OR
 * `email_templates.theme_id` still points at it (the FK is `ON DELETE SET NULL`,
 * so a delete would silently un-assign live rows). Distinct from `ThemeUsage` —
 * the guard also counts the tenant (org default) reference, which the library
 * "used by" line does not surface.
 */
export type ThemeReferences = {
  clients: number
  tenants: number
  campaigns: number
  emailTemplates: number
}
