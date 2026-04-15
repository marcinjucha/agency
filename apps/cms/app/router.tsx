import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export type RouterContext = {
  auth: { userId: string; tenantId: string; isSuperAdmin: boolean } | null
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    context: {
      auth: null,
    } satisfies RouterContext,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
