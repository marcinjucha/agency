import { createFileRoute } from '@tanstack/react-router'

const ROBOTS_CONTENT = `User-agent: *
Allow: /
Disallow: /survey/
Disallow: /api/

Sitemap: https://haloefekt.pl/sitemap.xml`

// TanStack Start v1 server file route.
// Returning a Response from the loader serves raw content for the matched URL.
// The [.txt] bracket convention maps this file to the path /robots.txt.
export const Route = createFileRoute('/robots.txt')({
  loader: async () => {
    return new Response(ROBOTS_CONTENT, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  },
})
