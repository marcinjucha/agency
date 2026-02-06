'use client'

import { useQuery } from '@tanstack/react-query'
import { getAppointments } from '../queries'
import { Card } from '@agency/ui'
import { useRouter } from 'next/navigation'
import { ExternalLink, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import type { AppointmentListItem, AppointmentStatus } from '../types'
import { getAppointmentStatusColor } from '@/lib/utils/status'
import { LoadingState, ErrorState, EmptyState } from '@/components/shared'

/**
 * AppointmentList Component
 *
 * Displays all appointments in a sortable table with:
 * - Client name column (25%)
 * - Email column (25%)
 * - Scheduled date/time column (25%)
 * - Status badge column (16%)
 * - Actions column (9%)
 *
 * Features:
 * - TanStack Query integration with 5-second auto-refresh
 * - Click row to navigate to response detail (if response exists)
 * - Loading state with skeleton rows
 * - Error state with retry button
 * - Empty state with helpful message
 * - Responsive table design
 *
 * @component
 * @returns Appointments table component
 */
export function AppointmentList() {
  const router = useRouter()
  const {
    data: appointments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 0 // Data is always considered stale
  })

  // LOADING STATE: Skeleton rows
  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingState variant="skeleton-table" rows={5} />
      </Card>
    )
  }

  // ERROR STATE: Show error with retry button
  if (error) {
    return (
      <ErrorState
        title="Failed to load appointments"
        message={error instanceof Error ? error.message : 'An error occurred'}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  // EMPTY STATE: No appointments
  if (!appointments || appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No appointments found"
        description="Appointments will appear here after clients book time slots."
        variant="card"
      />
    )
  }

  // SUCCESS STATE: Render table
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Appointments list">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Client Name
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Email
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Scheduled At
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Status
              </th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Table Rows */}
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                onRowClick={() => {
                  // Only navigate if response exists
                  if (appointment.response?.id) {
                    router.push(`/admin/responses/${appointment.response.id}`)
                  }
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Live region for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} loaded
      </div>

      {/* Footer with count */}
      <div className="px-6 py-3 bg-muted border-t border-border">
        <p className="text-xs text-muted-foreground">
          Showing {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
        </p>
      </div>
    </Card>
  )
}

/**
 * AppointmentRow Component
 *
 * Individual row in the appointments table
 *
 * @component
 * @param appointment - Appointment list item to display
 * @param onRowClick - Callback when row is clicked
 */
function AppointmentRow({
  appointment,
  onRowClick
}: {
  appointment: AppointmentListItem
  onRowClick: () => void
}) {
  // Format date/time: "Jan 15, 2026 • 10:00 AM - 11:00 AM"
  const formatDateTime = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      const date = format(start, 'MMM d, yyyy')
      const timeStart = format(start, 'h:mm a')
      const timeEnd = format(end, 'h:mm a')
      return `${date} • ${timeStart} - ${timeEnd}`
    } catch {
      return 'Invalid date'
    }
  }

  // Determine if row is clickable (has response)
  const hasResponse = !!appointment.response?.id
  const rowClassName = hasResponse
    ? 'hover:bg-muted cursor-pointer transition-colors'
    : ''

  return (
    <tr onClick={hasResponse ? onRowClick : undefined} className={rowClassName}>
      {/* Client Name Column */}
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-foreground truncate" title={appointment.client_name}>
          {appointment.client_name}
        </p>
      </td>

      {/* Email Column */}
      <td className="px-6 py-4">
        <p className="text-sm text-muted-foreground truncate" title={appointment.client_email}>
          {appointment.client_email}
        </p>
      </td>

      {/* Scheduled At Column */}
      <td className="px-6 py-4">
        <p className="text-sm text-muted-foreground">
          {formatDateTime(appointment.start_time, appointment.end_time)}
        </p>
      </td>

      {/* Status Column */}
      <td className="px-6 py-4">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getAppointmentStatusColor(
            appointment.status as AppointmentStatus
          )}`}
        >
          {appointment.status || 'pending'}
        </span>
      </td>

      {/* Actions Column */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          {hasResponse ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRowClick()
              }}
              className="p-3 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              aria-label="View response details"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
      </td>
    </tr>
  )
}
