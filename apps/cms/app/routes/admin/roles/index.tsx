import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getRolesFn } from '@/features/roles/server'
import { queryKeys } from '@/lib/query-keys'
import { RoleList } from '@/features/roles/components/RoleList'

export const Route = createFileRoute('/admin/roles/')({
  head: () => buildCmsHead(messages.nav.roles),
  loader: async ({ context: { queryClient, auth } }) => {
    const tenantId = auth?.isSuperAdmin ? undefined : undefined
    await queryClient.ensureQueryData({
      queryKey: queryKeys.roles.list(tenantId),
      queryFn: () => getRolesFn({ data: { tenantId } }),
    })
  },
  component: RolesPage,
})

function RolesPage() {
  return <RoleList />
}
