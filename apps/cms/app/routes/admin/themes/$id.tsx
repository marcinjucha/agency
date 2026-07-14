import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { Palette } from 'lucide-react'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { getThemeFn } from '@/features/themes/server'
import { ThemeEditor } from '@/features/themes/components/ThemeEditor'

export const Route = createFileRoute('/admin/themes/$id')({
  head: () => buildCmsHead(messages.themes.editThemeTitle),
  component: ThemeEditorPage,
})

function ThemeEditorPage() {
  const { id } = Route.useParams()

  // `getThemeFn` returns `Theme | null`; over the RPC boundary a null becomes
  // undefined, which TanStack Query rejects — coalesce back to null (a valid,
  // "not found" query value) so the not-found branch below renders cleanly.
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.themes.detail(id),
    queryFn: async () => (await getThemeFn({ data: { id } })) ?? null,
  })

  if (isLoading) return <LoadingState variant="skeleton-card" rows={4} />
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={Palette}
        title={messages.themes.notFound}
        description={messages.themes.notFoundDescription}
      />
    )
  }

  return <ThemeEditor theme={data} />
}
