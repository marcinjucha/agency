import { useState } from 'react'

/**
 * Copy text to the clipboard with transient success AND failure feedback.
 *
 * `copied` flips true for `resetMs` after a successful write so callers can
 * swap an icon (e.g. Copy/Link2 → Check) to confirm the action. `failed` flips
 * true for `resetMs` when the write throws (e.g. clipboard permission denied),
 * so callers can surface a minimal failure affordance instead of silently
 * leaving the user with a stale clipboard. Mirrors the inline `copyToClipboard`
 * pattern in SurveyLinks / LicenseDetailPanel, lifted here as an earned
 * abstraction (used by both MediaCard and MediaPreviewDialog).
 *
 * React Compiler memoizes automatically — no useCallback needed.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      setFailed(false)
      setCopied(true)
      setTimeout(() => setCopied(false), resetMs)
      return true
    } catch {
      setCopied(false)
      setFailed(true)
      setTimeout(() => setFailed(false), resetMs)
      return false
    }
  }

  return { copied, failed, copy }
}
