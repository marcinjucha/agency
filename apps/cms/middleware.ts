import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routes } from '@/lib/routes'
import { getRequiredPermission, hasPermission } from '@/lib/permissions'
import { fetchMiddlewareUser } from '@/lib/middleware-auth'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return NextResponse.redirect(new URL(routes.login, request.url))
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /admin routes — redirect unauthenticated to login
  if (request.nextUrl.pathname.startsWith(routes.admin.root) && !user) {
    return NextResponse.redirect(new URL(routes.login, request.url))
  }

  // Redirect logged-in users away from login page
  if (request.nextUrl.pathname === routes.login && user) {
    return NextResponse.redirect(new URL(routes.admin.root, request.url))
  }

  // --- Permission + feature flag route protection ---
  if (user && request.nextUrl.pathname.startsWith(routes.admin.root)) {
    const pathname = request.nextUrl.pathname
    const requiredPermission = getRequiredPermission(pathname)

    // Permission check: skip for routes with no permission mapping (e.g. /admin dashboard)
    if (requiredPermission) {
      const middlewareUser = await fetchMiddlewareUser(supabase, user.id)

      // User not found in users table — allow through (edge case, auth.ts handles)
      if (middlewareUser && !hasPermission(requiredPermission, middlewareUser.permissions)) {
        const unauthorizedUrl = new URL(routes.admin.root, request.url)
        unauthorizedUrl.searchParams.set('unauthorized', '1')
        return NextResponse.redirect(unauthorizedUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (*.svg, *.png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
