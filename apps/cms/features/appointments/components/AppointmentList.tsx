'use client'

import { useQuery } from '@tanstack/react-query'
import { getAppointments } from '../queries'
import { Button, Card } from '@legal-mind/ui'
import { useRouter } from 'next/navigation'
import { ExternalLink, AlertCircle, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import type { AppointmentListItem, AppointmentStatus } from '../types'

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
      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-200">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="col-span-3 text-sm font-semibold text-gray-900">Client Name</div>
            <div className="col-span-3 text-sm font-semibold text-gray-900">Email</div>
            <div className="col-span-3 text-sm font-semibold text-gray-900">Scheduled At</div>
            <div className="col-span-2 text-sm font-semibold text-gray-900">Status</div>
            <div className="col-span-1 text-sm font-semibold text-gray-900">Actions</div>
          </div>

          {/* Skeleton Rows */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50"
            >
              <div className="col-span-3 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-3 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-3 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-2 bg-gray-200 h-4 rounded animate-pulse" />
              <div className="col-span-1 bg-gray-200 h-4 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // ERROR STATE: Show error with retry button
  if (error) {
    return (
      <Card className="bg-red-50 border-red-200 p-6">
        <div className="flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Failed to load appointments</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex-shrink-0"
          >
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  // EMPTY STATE: No appointments
  if (!appointments || appointments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CalendarCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments found</h3>
        <p className="text-gray-600">
          Appointments will appear here after clients book time slots.
        </p>
      </Card>
    )
  }

  // SUCCESS STATE: Render table
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="divide-y divide-gray-200">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="col-span-3 text-sm font-semibold text-gray-900">Client Name</div>
              <div className="col-span-3 text-sm font-semibold text-gray-900">Email</div>
              <div className="col-span-3 text-sm font-semibold text-gray-900">Scheduled At</div>
              <div className="col-span-2 text-sm font-semibold text-gray-900">Status</div>
              <div className="col-span-1 text-sm font-semibold text-gray-900">Actions</div>
            </div>

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
          </div>
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
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
  // Get status badge color (handle null status from database)
  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800' // Default for null or unknown
    }
  }

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
    ? 'grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors'
    : 'grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200'

  return (
    <div onClick={hasResponse ? onRowClick : undefined} className={rowClassName}>
      {/* Client Name Column (25%) */}
      <div className="col-span-3">
        <p className="text-sm font-medium text-gray-900 truncate" title={appointment.client_name}>
          {appointment.client_name}
        </p>
      </div>

      {/* Email Column (25%) */}
      <div className="col-span-3">
        <p className="text-sm text-gray-600 truncate" title={appointment.client_email}>
          {appointment.client_email}
        </p>
      </div>

      {/* Scheduled At Column (25%) */}
      <div className="col-span-3">
        <p className="text-sm text-gray-600">
          {formatDateTime(appointment.start_time, appointment.end_time)}
        </p>
      </div>

      {/* Status Column (16%) */}
      <div className="col-span-2">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            appointment.status
          )}`}
        >
          {appointment.status || 'pending'}
        </span>
      </div>

      {/* Actions Column (9%) */}
      <div className="col-span-1 flex items-center justify-end">
        {hasResponse ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRowClick()
            }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="View response details"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </div>
    </div>
  )
}
