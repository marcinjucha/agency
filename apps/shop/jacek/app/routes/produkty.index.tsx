import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/produkty/')({
  loader: () => {
    throw redirect({ to: '/' })
  },
})
