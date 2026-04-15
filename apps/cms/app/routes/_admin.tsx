import { createFileRoute, redirect, Outlet, useNavigate } from '@tanstack/react-router'
import { logoutFn } from '@/lib/server-fns/auth'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ context }) => {
    if (!context.auth) {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logoutFn()
    await navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-foreground">Halo Efekt CMS</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{auth?.tenantId}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {messages.navigation.logout}
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
