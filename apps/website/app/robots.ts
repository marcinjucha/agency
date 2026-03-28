import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/survey/'],
      },
    ],
    sitemap: 'https://haloefekt.pl/sitemap.xml',
  }
}
