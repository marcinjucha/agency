import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { auth } = Route.useRouteContext()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>Tenant ID: {auth?.tenantId}</p>
        <p>Super Admin: {auth?.isSuperAdmin ? 'Tak' : 'Nie'}</p>
      </div>
    </div>
  )
}
