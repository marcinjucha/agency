import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'viewport',
    // 5min so viewport-preloaded data is still fresh when clicked (no skeleton flash); matches route staleTime
    defaultPreloadStaleTime: 1000 * 60 * 5,
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
