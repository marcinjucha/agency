import { AppointmentList } from '@/features/appointments/components/AppointmentList'

export const metadata = {
  title: 'Appointments | Legal-Mind CMS',
  description: 'View and manage client appointments',
}

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Appointments
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          View and manage client appointments.
        </p>
      </div>
      <AppointmentList />
    </div>
  )
}
