import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

export type RouterContext = {
  queryClient: QueryClient
}

export function getRouter() {
  const queryClient = buildQueryClient()

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    context: {
      queryClient,
    } satisfies RouterContext,
  })
  return router
}

function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,   // 5min — blog data refreshes on next navigation after 5min
        gcTime: 1000 * 60 * 10,     // 10min — keep unused data in memory for back navigation
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
        refetchOnWindowFocus: false, // public site — no need to refetch on tab focus
        refetchOnMount: false,       // trust staleTime — don't refetch if data is fresh
        networkMode: 'offlineFirst', // render from cache even when offline
      },
    },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
