/**
 * Centralized route paths for Website application.
 * Single source of truth — prevents typos in href strings.
 *
 * Usage: import { routes } from '@/lib/routes'
 *
 * Note: CTA hrefs (Hero, FinalCTA, Navbar ctaHref) come from DB blocks,
 * not from this file. Only hardcoded paths belong here.
 */

export const routes = {
  home: '/',

  // Blog
  blog: '/blog',
  blogPost: (slug: string) => `/blog/${slug}`,

  // Legal
  regulamin: '/regulamin',
  politykaPrywatnosci: '/polityka-prywatnosci',

  // Survey
  surveySuccess: (token: string) => `/survey/${token}/success`,

  // API routes
  api: {
    surveySubmit: '/api/survey/submit',
    calendarSlots: '/api/calendar/slots',
    calendarBook: '/api/calendar/book',
  },
} as const
