import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

export type RouterContext = {
  auth: { userId: string; tenantId: string; isSuperAdmin: boolean } | null
  queryClient: QueryClient
}

export function getRouter() {
  const queryClient = buildQueryClient()

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    // Router always runs the loader; TanStack Query decides whether to fetch or serve from cache
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    context: {
      auth: null,
      queryClient,
    } satisfies RouterContext,
  })
  return router
}

// ---------------------------------------------------------------------------
// QueryClient factory — single source of truth for CMS query config
// ---------------------------------------------------------------------------

export function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,   // 5 minutes
        gcTime: 1000 * 60 * 10,     // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
