import { useState } from 'react'

export type SortMode = 'newest' | 'oldest' | 'title-az' | 'title-za'

/**
 * Persists sort preference to localStorage.
 *
 * Uses a useState initializer (not useEffect) so the correct mode is
 * available on the first render — avoids a flash of the wrong sort on page load.
 */
export function useSortMode(
  key: string = 'blog-sort-mode',
  defaultMode: SortMode = 'newest'
): [SortMode, (mode: SortMode) => void] {
  const [sortMode, setSortModeState] = useState<SortMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(key) as SortMode) ?? defaultMode
    }
    return defaultMode
  })

  const setSortMode = (mode: SortMode) => {
    setSortModeState(mode)
    localStorage.setItem(key, mode)
  }

  return [sortMode, setSortMode]
}
