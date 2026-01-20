import { AppointmentList } from '@/features/appointments/components/AppointmentList'

export const metadata = {
  title: 'Appointments | Legal-Mind CMS',
  description: 'View and manage client appointments',
}

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Appointments
        </h1>
        <p className="mt-2 text-lg text-gray-500">
          View and manage client appointments.
        </p>
      </div>
      <AppointmentList />
    </div>
  )
}
