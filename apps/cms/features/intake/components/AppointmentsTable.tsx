'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarCheck, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale/pl'
import {
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@agency/ui'
import { getAppointments } from '../../appointments/queries'
import type { AppointmentListItem, AppointmentStatus } from '../../appointments/types'
import { getAppointmentStatusColor } from '@/lib/utils/status'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

const REFETCH_INTERVAL = 30_000

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Zaplanowana' },
  { value: 'completed', label: 'Zakończona' },
  { value: 'cancelled', label: 'Anulowana' },
  { value: 'no_show', label: 'Nieobecność' },
]

function formatDateTime(startTime: string, endTime: string): string {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const date = format(start, 'd MMM yyyy', { locale: pl })
    const timeStart = format(start, 'HH:mm', { locale: pl })
    const timeEnd = format(end, 'HH:mm', { locale: pl })
    return `${date} \u2022 ${timeStart}\u2013${timeEnd}`
  } catch {
    return messages.appointments.invalidDate
  }
}

export function AppointmentsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('appointmentStatus') as AppointmentStatus | null

  const {
    data: appointments,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['intake', 'appointments'],
    queryFn: getAppointments,
    refetchInterval: REFETCH_INTERVAL,
  })

  const handleStatusFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('appointmentStatus')
    } else {
      params.set('appointmentStatus', value)
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleRowClick = (appointment: AppointmentListItem) => {
    if (appointment.response?.id) {
      router.push(routes.admin.response(appointment.response.id))
    }
  }

  if (isLoading) {
    return <LoadingState variant="skeleton-table" rows={5} />
  }

  if (error) {
    return (
      <ErrorState
        title={messages.appointments.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
      />
    )
  }

  const filtered = statusFilter
    ? appointments?.filter((a) => a.status === statusFilter)
    : appointments

  if (!appointments || appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title={messages.appointments.noAppointments}
        description={messages.appointments.noAppointmentsDescription}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter ?? 'all'}
          onValueChange={handleStatusFilterChange}
        >
          <SelectTrigger className="w-48" aria-label={messages.appointments.status}>
            <SelectValue placeholder={messages.intake.tableFilterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.intake.tableFilterStatus}: Wszystkie</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label={messages.intake.tabAppointments}>
            <thead className="bg-muted border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  {messages.appointments.clientName}
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  {messages.appointments.email}
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  {messages.appointments.scheduledAt}
                </th>
                <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  {messages.appointments.status}
                </th>
                <th scope="col" className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                  {messages.appointments.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered && filtered.length > 0 ? (
                filtered.map((appointment) => {
                  const hasResponse = !!appointment.response?.id
                  return (
                    <tr
                      key={appointment.id}
                      onClick={hasResponse ? () => handleRowClick(appointment) : undefined}
                      className={
                        hasResponse
                          ? 'hover:bg-muted/50 cursor-pointer transition-colors'
                          : 'transition-colors'
                      }
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground truncate" title={appointment.client_name}>
                          {appointment.client_name}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground truncate" title={appointment.client_email}>
                          {appointment.client_email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(appointment.start_time, appointment.end_time)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getAppointmentStatusColor(
                            appointment.status as AppointmentStatus
                          )}`}
                        >
                          {STATUS_OPTIONS.find((o) => o.value === appointment.status)?.label ?? appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hasResponse ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRowClick(appointment)
                            }}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                            aria-label={messages.appointments.viewResponseDetails}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      {messages.intake.tableNoResults}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {messages.intake.tableNoResultsDescription}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {messages.appointments.showingAppointments(filtered?.length ?? 0)}
        </div>

        <div className="px-6 py-3 bg-muted border-t border-border">
          <p className="text-xs text-muted-foreground">
            {messages.appointments.showingAppointments(filtered?.length ?? 0)}
          </p>
        </div>
      </Card>
    </div>
  )
}
