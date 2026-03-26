import { AppointmentList } from '@/features/appointments/components/AppointmentList'

export const metadata = {
  title: 'Wizyty | Halo-Efekt CMS',
  description: 'Przeglądaj wizyty klientów',
}

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Wizyty
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Przeglądaj i zarządzaj wizytami klientów.
        </p>
      </div>
      <AppointmentList />
    </div>
  )
}
