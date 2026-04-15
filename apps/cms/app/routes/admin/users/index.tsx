import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getUsersFn, getTenantRolesFn } from '@/features/users/server'
import { queryKeys } from '@/lib/query-keys'
import { UserList } from '@/features/users/components/UserList'

export const Route = createFileRoute('/admin/users/')({
  head: () => buildCmsHead(messages.nav.users),
  loader: async ({ context: { queryClient, auth } }) => {
    const tenantId = undefined
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: queryKeys.users.list(tenantId),
        queryFn: () => getUsersFn({ data: { tenantId } }),
      }),
      queryClient.ensureQueryData({
        queryKey: queryKeys.roles.list(tenantId),
        queryFn: () => getTenantRolesFn({ data: { tenantId } }),
      }),
    ])
  },
  component: UsersPage,
})

function UsersPage() {
  return <UserList />
}
