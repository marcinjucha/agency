'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@agency/ui'
import { Inbox, Phone, CalendarDays, CalendarClock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getIntakeStats } from '../queries'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'

const REFETCH_INTERVAL = 30_000

interface StatCardProps {
  icon: LucideIcon
  label: string
  count: number
}

function StatCard({ icon: Icon, label, count }: StatCardProps) {
  return (
    <div className="flex-1 bg-card border rounded-lg p-4 flex items-center gap-3">
      <div className="bg-muted rounded-full p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function StatsBarSkeleton() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 bg-card border rounded-lg p-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatsBar() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.intake.stats,
    queryFn: getIntakeStats,
    refetchInterval: REFETCH_INTERVAL,
  })

  if (isLoading) return <StatsBarSkeleton />

  const stats = data ?? {
    newResponses: 0,
    waitingForContact: 0,
    appointmentsToday: 0,
    appointmentsTomorrow: 0,
  }

  return (
    <div className="flex gap-4">
      <StatCard
        icon={Inbox}
        label={messages.intake.statsNewResponses}
        count={stats.newResponses}
      />
      <StatCard
        icon={Phone}
        label={messages.intake.statsWaitingContact}
        count={stats.waitingForContact}
      />
      <StatCard
        icon={CalendarDays}
        label={messages.intake.statsAppointmentsToday}
        count={stats.appointmentsToday}
      />
      <StatCard
        icon={CalendarClock}
        label={messages.intake.statsAppointmentsTomorrow}
        count={stats.appointmentsTomorrow}
      />
    </div>
  )
}
