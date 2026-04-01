import { useState } from 'react'

type ViewMode = 'grid' | 'list'

/**
 * Persists list/grid view preference to localStorage.
 *
 * Uses a useState initializer (not useEffect) so the correct mode is
 * available on the first render — avoids a flash of the wrong view.
 */
export function useViewMode(
  key: string,
  defaultMode: ViewMode = 'grid'
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(key) as ViewMode) ?? defaultMode
    }
    return defaultMode
  })

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(key, mode)
  }

  return [viewMode, setViewMode]
}
