import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getRoles } from '@/features/roles/queries'
import { queryKeys } from '@/lib/query-keys'
import { RoleList } from '@/features/roles/components/RoleList'

export const Route = createFileRoute('/admin/roles/')({
  head: () => buildCmsHead(messages.nav.roles),
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData({
      queryKey: queryKeys.roles.list(undefined),
      queryFn: () => getRoles(undefined),
    })
  },
  component: RolesPage,
})

function RolesPage() {
  return <RoleList />
}
