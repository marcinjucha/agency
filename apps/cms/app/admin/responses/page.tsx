import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'

export default function ResponsesPage() {
  redirect(routes.admin.intake)
}
