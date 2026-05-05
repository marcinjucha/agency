import { useEffect, useState } from 'react'

/**
 * Reactive `document.visibilityState === 'visible'` boolean.
 *
 * SSR-safe: defaults to `true` when `document` is undefined (avoids
 * pessimistic-pause during render — re-evaluates on hydration).
 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )

  useEffect(() => {
    function handleChange(): void {
      setVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', handleChange)
    return () => document.removeEventListener('visibilitychange', handleChange)
  }, [])

  return visible
}
