import { createFileRoute, redirect } from '@tanstack/react-router'
import { routes } from '@/lib/routes'

export const Route = createFileRoute('/admin/responses/')({
  beforeLoad: () => {
    throw redirect({ to: routes.admin.intake, search: {} })
  },
  component: () => null,
})
