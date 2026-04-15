import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Website is fully public — no auth context needed
export type RouterContext = Record<string, never>

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
