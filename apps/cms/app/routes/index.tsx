import { createFileRoute, redirect } from '@tanstack/react-router'

// Root "/" always redirects to "/admin"
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin' })
  },
  component: () => null,
})
