import { createFileRoute } from '@tanstack/react-router'

const ROBOTS_CONTENT = `User-agent: *
Allow: /

Sitemap: https://jacek.haloefekt.pl/sitemap.xml`

export const Route = createFileRoute('/robots[.txt]')({
  component: () => null,
  server: {
    handlers: {
      GET: async () => {
        return new Response(ROBOTS_CONTENT, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      },
    },
  },
})
