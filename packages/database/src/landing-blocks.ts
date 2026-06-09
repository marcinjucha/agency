// Canonical SEO metadata type — all fields optional (safe for JSONB storage).
// Required fields enforced via Zod validation in each app, not here.
export type SeoMetadata = {
  title?: string
  description?: string
  ogImage?: string
  keywords?: string[]
}

// Reduced landing page model — `landing_pages` holds only a configurable survey CTA URL.
// (Block-based landing system removed; the public website renders a static landing.)
export interface LandingPage {
  id: string
  slug: string
  cta_url: string | null
}

// `landing_pages` is NOT in generated Supabase types — rows arrive as untyped objects.
// Map a raw row → the reduced LandingPage shape via a single internal cast.
export function toLandingPage(raw: unknown): LandingPage {
  const row = raw as Record<string, unknown>
  return {
    id: row.id as string,
    slug: row.slug as string,
    cta_url: (row.cta_url ?? null) as string | null,
  }
}
