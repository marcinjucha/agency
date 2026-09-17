import { ResultAsync, ok, err } from 'neverthrow'
import { createAnonServerClient } from '@/lib/supabase/anon.server'

// ---------------------------------------------------------------------------
// Legal pages — PUBLIC read layer (consumed by landings deployed OUTSIDE this
// CMS, e.g. the Przystań Inwestorów front on the VPS).
//
// Runs on the ANON Supabase client (publishable key, no session) so RLS is the
// enforcement boundary: the `pages` anon policy is `is_published = true`
// (migration 20260317200000_create_pages.sql), so drafts are invisible here.
// NEVER swap this for the service client — it bypasses RLS and would serve
// unpublished legal text as if it were in force.
//
// The website app (apps/website) reads the SAME rows through the service client
// + an explicit tenant filter; it can, because it runs inside this monorepo and
// knows TENANT_ID. A foreign landing does not, hence this HTTP-facing path.
// ---------------------------------------------------------------------------

export const LEGAL_PAGE_PUBLIC_COLUMNS = 'slug, title, html_body, updated_at' as const

export type PublicLegalPage = {
  slug: string
  title: string
  html_body: string
  updated_at: string
}

type LegalPageRow = {
  slug: string
  title: string
  html_body: string | null
  updated_at: string
}

/**
 * Fetch one published legal page by slug.
 *
 * Returns:
 *   ok(PublicLegalPage) — published and visible to anon,
 *   ok(null)            — missing OR unpublished (RLS makes the two
 *                         indistinguishable, and both map to 404),
 *   err(message)        — a genuine DB/query failure (maps to 500).
 */
export function getPublishedLegalPageBySlug(
  slug: string,
): ResultAsync<PublicLegalPage | null, string> {
  const supabase = createAnonServerClient()

  return ResultAsync.fromPromise(
    supabase
      .from('pages')
      .select(LEGAL_PAGE_PUBLIC_COLUMNS)
      .eq('slug', slug)
      .eq('page_type', 'legal')
      // Defense-in-depth: RLS already hides drafts, but keep published-only
      // visible at the query layer so an RLS misconfig can't leak one.
      .eq('is_published', true)
      // `pages` is UNIQUE(tenant_id, slug), NOT unique on slug alone, and this
      // query has no tenant filter (a foreign landing has no tenant id). Two
      // tenants CAN legitimately hold the same slug, which would make
      // `.maybeSingle()` throw instead of serving the page. Hence limit(1):
      // slugs consumed this way are prefixed per brand
      // (`przystan-inwestorow-regulamin`), so a collision means a naming
      // mistake, not an ambiguity worth a 500.
      .limit(1),
    () => 'legal_page_query_failed',
  ).andThen((res) => {
    const { data, error } = res as {
      data: LegalPageRow[] | null
      error: { message: string } | null
    }
    if (error) return err(error.message)

    const row = data?.[0]
    if (!row) return ok<PublicLegalPage | null, string>(null)

    return ok<PublicLegalPage | null, string>({
      slug: row.slug,
      title: row.title,
      html_body: row.html_body ?? '',
      updated_at: row.updated_at,
    })
  })
}
