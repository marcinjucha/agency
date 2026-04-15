/**
 * Head meta builder for CMS admin routes.
 *
 * Admin panel uses noindex/nofollow — never indexed by search engines.
 * Title pattern: "{page} | Halo Efekt CMS", or just "Halo Efekt CMS" for root.
 */
export function buildCmsHead(pageTitle?: string) {
  const title = pageTitle ? `${pageTitle} | Halo Efekt CMS` : 'Halo Efekt CMS'

  return {
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }
}
