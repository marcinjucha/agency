import { useQuery } from '@tanstack/react-query'
import type { ThemeColorMap } from '@agency/email'
import { queryKeys } from '@/lib/query-keys'
import { getResolvedEmailThemeFn } from '../server'

/**
 * Resolved tenant theme map (token key → literal hex) for the block editor's
 * theme-token swatches. Returns `{}` while loading / on failure — the token
 * <select> then shows swatches without colour, and the custom ColorPicker still
 * works, so the editor degrades gracefully. Cached 5 min (theme changes rarely).
 */
export function useResolvedEmailTheme(): ThemeColorMap {
  const { data } = useQuery({
    queryKey: queryKeys.email.resolvedTheme,
    queryFn: () => getResolvedEmailThemeFn(),
    staleTime: 5 * 60 * 1000,
  })
  return data ?? {}
}
