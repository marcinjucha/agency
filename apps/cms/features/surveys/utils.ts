import type { SurveyWithLinks } from './types'

/**
 * Returns true if at least one survey link is considered active:
 * - is_active flag is true
 * - not expired (expires_at is null or in the future)
 * - submission limit not reached (max_submissions is null or count < limit)
 */
export function hasActiveLink(links: SurveyWithLinks['survey_links']): boolean {
  if (links.length === 0) return false
  const now = new Date()
  return links.some(
    (link) =>
      link.is_active === true &&
      (link.expires_at == null || new Date(link.expires_at) > now) &&
      (link.max_submissions == null || (link.submission_count ?? 0) < link.max_submissions)
  )
}
