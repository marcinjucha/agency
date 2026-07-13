import { createContext, useContext, type ReactNode } from 'react'
import type { ThemeColorMap } from '@agency/email'

// ---------------------------------------------------------------------------
// EmailThemeContext — the resolved (token key → literal hex) theme map for the
// template currently open in the editor.
//
// WHY a context (not prop drilling): two distant consumers need the SAME map —
// the Canvas block renderer (colours the live preview) and the deep per-block
// ThemeTokenSelect (colours the token swatches). The map is resolved ONCE by
// EmailTemplateEditor via `useResolvedEmailTheme(themeId)` (a query keyed by the
// picked theme_id, so it recolours the instant the picker changes) and shared
// here. Consumers never call the hook themselves → single source, no duplicate
// fetches, no threading through Inspector → PropertiesTab → controls.
//
// Default `{}` degrades gracefully: swatches render colourless, the custom
// ColorPicker still works — identical to the pre-context fallback.
// ---------------------------------------------------------------------------

const EmailThemeContext = createContext<ThemeColorMap>({})

export function EmailThemeProvider({
  theme,
  children,
}: {
  theme: ThemeColorMap
  children: ReactNode
}) {
  return <EmailThemeContext.Provider value={theme}>{children}</EmailThemeContext.Provider>
}

/** Resolved theme map for the open template (token key → hex). `{}` while loading. */
export function useEmailThemeMap(): ThemeColorMap {
  return useContext(EmailThemeContext)
}
