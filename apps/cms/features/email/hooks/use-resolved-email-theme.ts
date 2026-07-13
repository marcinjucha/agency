import { useQuery } from '@tanstack/react-query'
import type { ThemeColorMap } from '@agency/email'
import { queryKeys } from '@/lib/query-keys'
import { getResolvedEmailThemeFn } from '../server'

/**
 * Resolved email theme map (token key → literal hex) for the block editor's
 * theme-token swatches + live Canvas preview. `themeId` reflects the theme
 * PICKED in the editor (null = inherit the tenant default) and is part of the
 * query key, so changing the picker refetches the effective map — the same map
 * the server bakes into `html_body` at save, keeping preview colours truthful.
 *
 * Returns `{}` while loading / on failure — swatches then render colourless and
 * the custom ColorPicker still works, so the editor degrades gracefully. Cached
 * 5 min per themeId (theme contents change rarely; a theme edit invalidates the
 * `resolvedTheme` prefix, covering every themeId variant).
 */
export function useResolvedEmailTheme(themeId: string | null): ThemeColorMap {
  const { data } = useQuery({
    queryKey: [...queryKeys.email.resolvedTheme, themeId],
    queryFn: () => getResolvedEmailThemeFn({ data: { themeId } }),
    staleTime: 5 * 60 * 1000,
  })
  return data ?? {}
}
