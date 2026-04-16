import { createFileRoute } from '@tanstack/react-router'
import { IntakeHub } from '@/features/intake/components/IntakeHub'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/admin/intake/')({
  head: () => buildCmsHead(messages.nav.intake),
  validateSearch: (search: Record<string, unknown>): { status?: string; survey?: string; appointmentStatus?: string } => ({
    status: search.status as string | undefined,
    survey: search.survey as string | undefined,
    appointmentStatus: search.appointmentStatus as string | undefined,
  }),
  component: () => <IntakeHub />,
})
