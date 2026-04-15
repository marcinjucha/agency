import { createFileRoute, redirect, Outlet, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PermissionsProvider } from '@/contexts/permissions-context'
import { SidebarV2 } from '@/components/admin/SidebarV2'
import { logoutFn } from '@/lib/server-fns/auth'
import { getAdminLayoutDataFn } from '@/lib/server-fns/admin-layout'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ context }) => {
    if (!context.auth) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getAdminLayoutDataFn(),
  component: AdminLayout,
})

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

function AdminLayout() {
  const layoutData = Route.useLoaderData()
  const navigate = useNavigate()
  const [queryClient] = useState(() => buildQueryClient())

  const handleLogout = async () => {
    await logoutFn()
    queryClient.clear()
    await navigate({ to: '/login' })
  }

  if (!layoutData) return null

  return (
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider
        userId={layoutData.userId}
        permissions={layoutData.permissions}
        isSuperAdmin={layoutData.isSuperAdmin}
        roleName={layoutData.roleName}
        tenantId={layoutData.tenantId}
        tenantName={layoutData.tenantName}
        enabledFeatures={layoutData.enabledFeatures}
        tenants={layoutData.tenants}
      >
        <AdminShell onLogout={handleLogout} />
      </PermissionsProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AdminShell({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        {messages.nav.skipToContent}
      </a>
      <SidebarV2 onLogout={onLogout} />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// QueryClient factory — single source of truth for CMS query config
// ---------------------------------------------------------------------------

function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,    // 5 minutes
        gcTime: 1000 * 60 * 10,      // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}
