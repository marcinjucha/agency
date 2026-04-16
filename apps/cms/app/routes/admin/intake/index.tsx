import { createFileRoute } from '@tanstack/react-router'
import { IntakeHub } from '@/features/intake/components/IntakeHub'
import { getPipelineResponsesFn } from '@/features/intake/server'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'

export const Route = createFileRoute('/admin/intake/')({
  head: () => buildCmsHead(messages.nav.intake),
  validateSearch: (search: Record<string, unknown>): { status?: string; survey?: string; appointmentStatus?: string } => ({
    status: search.status as string | undefined,
    survey: search.survey as string | undefined,
    appointmentStatus: search.appointmentStatus as string | undefined,
  }),
  // Pre-populate TanStack Query cache so IntakeHub renders instantly from cache.
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.intake.pipeline,
      queryFn: async () => {
        const data = await getPipelineResponsesFn()
        return data
      },
    })
  },
  component: () => <IntakeHub />,
})
