import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export type Locale = 'pl' | 'en'

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['pl', 'en'],

  // Used when no locale matches
  defaultLocale: 'pl',

  // Used to namespace the default locale
  localePrefix: 'as-needed'
})

// Lightweight wrappers around Next.js navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
