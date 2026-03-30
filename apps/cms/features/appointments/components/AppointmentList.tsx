'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAppointments } from '../queries'
import { deleteAppointment } from '../actions'
import {
  Card, LoadingState, ErrorState, EmptyState,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import { useRouter } from 'next/navigation'
import { ExternalLink, CalendarCheck, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale/pl'
import type { AppointmentListItem, AppointmentStatus } from '../types'
import { getAppointmentStatusColor } from '@/lib/utils/status'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export function AppointmentList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteAppointment(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }) },
  })
  const {
    data: appointments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.appointments.all,
    queryFn: getAppointments,
    refetchInterval: 5000,
    staleTime: 0
  })

  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingState variant="skeleton-table" rows={5} />
      </Card>
    )
  }

  if (error) {
    return (
      <ErrorState
        title={messages.appointments.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  if (!appointments || appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title={messages.appointments.noAppointments}
        description={messages.appointments.noAppointmentsDescription}
        variant="card"
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Appointments list">
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
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                {messages.appointments.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                onRowClick={() => {
                  if (appointment.response?.id) {
                    router.push(routes.admin.response(appointment.response.id))
                  }
                }}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {messages.appointments.appointmentsLoaded(appointments.length)}
      </div>

      <div className="px-6 py-3 bg-muted border-t border-border">
        <p className="text-xs text-muted-foreground">
          {messages.appointments.showingAppointments(appointments.length)}
        </p>
      </div>
    </Card>
  )
}

function AppointmentRow({
  appointment,
  onRowClick,
  onDelete,
}: {
  appointment: AppointmentListItem
  onRowClick: () => void
  onDelete: (id: string) => void
}) {
  const formatDateTime = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      const date = format(start, 'd MMM yyyy', { locale: pl })
      const timeStart = format(start, 'HH:mm', { locale: pl })
      const timeEnd = format(end, 'HH:mm', { locale: pl })
      return `${date} \u2022 ${timeStart} - ${timeEnd}`
    } catch {
      return messages.appointments.invalidDate
    }
  }

  const hasResponse = !!appointment.response?.id
  const rowClassName = hasResponse
    ? 'hover:bg-muted cursor-pointer transition-colors'
    : ''

  return (
    <tr onClick={hasResponse ? onRowClick : undefined} className={rowClassName}>
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
          {appointment.status || 'oczekuje'}
        </span>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-3 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                aria-label="Usuń"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.appointments.deleteAppointmentConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{messages.appointments.deleteAppointmentConfirmDescription(appointment.client_name)}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(appointment.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {messages.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {hasResponse ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRowClick()
              }}
              className="p-3 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              aria-label={messages.appointments.viewResponseDetails}
            >
              <ExternalLink className="h-5 w-5" />
            </button>
          ) : (
            <span className="text-muted-foreground text-sm">&mdash;</span>
          )}
        </div>
      </td>
    </tr>
  )
}
