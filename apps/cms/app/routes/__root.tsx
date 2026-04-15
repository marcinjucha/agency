/// <reference types="vite/client" />
import { createRootRouteWithContext, HeadContent, Outlet, Scripts, ScrollRestoration } from '@tanstack/react-router'
import appCss from '../globals.css?url'
import { getAuthContextFn } from '@/lib/server-fns/auth'
import type { RouterContext } from '../router'
import { buildCmsHead } from '@/lib/head'

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const auth = await getAuthContextFn()
    return { auth }
  },
  head: () => ({
    ...buildCmsHead(),
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="pl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
