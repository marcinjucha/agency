import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'

export default function AppointmentsPage() {
  redirect(routes.admin.intake)
}
