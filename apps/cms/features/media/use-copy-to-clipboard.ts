import { useState } from 'react'

/**
 * Copy text to the clipboard with transient success feedback.
 *
 * `copied` flips true for `resetMs` after a successful write so callers can
 * swap an icon (e.g. Copy/Link2 → Check) to confirm the action. Mirrors the
 * inline `copyToClipboard` pattern in SurveyLinks / LicenseDetailPanel, lifted
 * here as an earned abstraction (used by both MediaCard and MediaPreviewDialog).
 *
 * React Compiler memoizes automatically — no useCallback needed.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false)

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), resetMs)
      return true
    } catch {
      return false
    }
  }

  return { copied, copy }
}
