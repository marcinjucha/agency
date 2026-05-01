import { createServerClient as createSupabaseClient, type CookieMethodsServer } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/start-server-core'
import type { Database } from '@agency/database'

export function createServerClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env.local.'
    )
  }

  return createSupabaseClient<Database>(url, key, {
    cookies: {
      getAll() {
        const cookies = getCookies()
        return Object.entries(cookies).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet: Parameters<NonNullable<CookieMethodsServer['setAll']>>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options)
        })
      },
    },
  })
}
