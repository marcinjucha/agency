import { createFileRoute } from '@tanstack/react-router'
import { IntakeHub } from '@/features/intake/components/IntakeHub'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/admin/intake/')({
  head: () => buildCmsHead(messages.nav.intake),
  component: () => <IntakeHub />,
})
