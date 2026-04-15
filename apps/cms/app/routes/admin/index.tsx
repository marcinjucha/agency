import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePermissions } from '@/contexts/permissions-context'
import { messages } from '@/lib/messages'
import { buildCmsHead } from '@/lib/head'
import { getDashboardStatsFn } from '@/lib/server-fns/dashboard'
import type { DashboardStats } from '@/lib/server-fns/dashboard'

export const Route = createFileRoute('/admin/')({
  head: () => buildCmsHead(messages.nav.dashboard),
  component: DashboardPage,
})

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function DashboardPage() {
  const { tenantName, isSuperAdmin } = usePermissions()
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => getDashboardStatsFn(),
  })

  return (
    <div className="space-y-6">
      <DashboardHeader tenantName={tenantName} />
      <StatsGrid stats={stats} isLoading={isLoading} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DashboardHeader({ tenantName }: { tenantName: string | null }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{messages.nav.dashboard}</h1>
      {tenantName && (
        <p className="text-sm text-muted-foreground mt-1">{tenantName}</p>
      )}
    </div>
  )
}

function StatsGrid({
  stats,
  isLoading,
  isSuperAdmin,
}: {
  stats: DashboardStats | undefined
  isLoading: boolean
  isSuperAdmin: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label={messages.nav.surveys} value={stats?.surveys ?? '—'} loading={isLoading} />
      <StatCard label={messages.nav.intake} value={stats?.responses ?? '—'} loading={isLoading} />
      <StatCard label={messages.nav.calendar} value={stats?.appointments ?? '—'} loading={isLoading} />
      {isSuperAdmin && (
        <StatCard label={messages.tenants.title} value={stats?.tenants ?? '—'} loading={isLoading} />
      )}
    </div>
  )
}

type StatCardProps = { label: string; value: number | string; loading: boolean }

function StatCard({ label, value, loading }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">
        {loading ? '…' : value}
      </p>
    </div>
  )
}
