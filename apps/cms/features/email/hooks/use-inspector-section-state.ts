import { useEffect, useState } from 'react'

/**
 * Inspector section open/closed state, persisted to localStorage per-blockType.
 *
 * SSR safety: initial state ALWAYS = DEFAULT_SECTIONS, not read from localStorage.
 * Server and client first-paint agree → no hydration warning. localStorage read
 * happens in useEffect post-mount (one frame of "default" then collapse if user
 * previously closed). Matches CMS conventions for other localStorage-backed UI
 * state (list/grid view, sidebar collapsed, etc.).
 *
 * Reset on blockType change is handled by `<CollapsibleCard key={selected.id}>`
 * at the call site (parent already remounts the inspector body per-block).
 */

const STORAGE_PREFIX = 'email-inspector-sections-'

// P1-4 fix (AAA-T-221 design review): Typografia opens by default because it's
// part of the "design the block" mental model — users expect text-style controls
// right after Treść. Layout (margins/padding) stays closed as advanced.
const DEFAULT_SECTIONS: Readonly<Record<string, boolean>> = {
  content: true,
  typography: true,
  // Phase 4 (AAA-T-221): "Bordery i tło" is advanced — closed by default.
  border: false,
  layout: false,
}

export function useInspectorSectionState(
  blockType: string,
): readonly [Record<string, boolean>, (sectionId: string, open: boolean) => void] {
  const [sections, setSections] = useState<Record<string, boolean>>({ ...DEFAULT_SECTIONS })

  // Read persisted state AFTER mount — never in useState initializer.
  // Reason: useState initializer would run on server during SSR where
  // `window` is undefined; reading on client only via useEffect ensures
  // server-rendered HTML and client first paint agree.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${blockType}`)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setSections({ ...DEFAULT_SECTIONS, ...parsed })
      }
    } catch {
      // Malformed JSON or storage exception — silent fallback to defaults.
    }
  }, [blockType])

  const setSectionOpen = (sectionId: string, open: boolean) => {
    setSections((prev) => {
      const next = { ...prev, [sectionId]: open }
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`${STORAGE_PREFIX}${blockType}`, JSON.stringify(next))
        }
      } catch {
        // quota / private mode — silent
      }
      return next
    })
  }

  return [sections, setSectionOpen] as const
}
