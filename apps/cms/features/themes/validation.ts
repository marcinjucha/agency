import { z } from 'zod'
import { themeTokensSchema } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Theme Manager (iter D2) — named-theme CRUD validation.
//
// Reuses `themeTokensSchema` from @/lib/theme (the SAME hex-validated,
// anchored-regex token schema the resolver + email path already trust) — the
// theme library never invents its own token validation. The createServerFn
// wire-boundary wrappers below MUST be applied via the FUNCTION-form
// inputValidator `(v) => schema.parse(v)` (a raw schema silently bypasses
// validation — features/CLAUDE.md).
// ---------------------------------------------------------------------------

/** Create/update payload — a display name + the whole hex-validated token blob. */
export const themeInputSchema = z.object({
  name: z.string().min(1).max(120),
  tokens: themeTokensSchema,
})

export type ThemeInput = z.infer<typeof themeInputSchema>

/** Wire wrapper: `{ id }` for get / delete / duplicate / usage-by-id. */
export const themeIdSchema = z.object({ id: z.string().uuid() })

/** Wire wrapper: `{ id, data }` for update (flat `data` — RPC already wraps once). */
export const updateThemeInputSchema = z.object({
  id: z.string().uuid(),
  data: themeInputSchema,
})

/** Wire wrapper: optional `{ id }` for the usage helper (absent → zero counts). */
export const themeUsageInputSchema = z.object({ id: z.string().uuid().optional() })
