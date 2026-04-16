import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getUsersFn, getTenantRolesFn } from '@/features/users/server'
import { queryKeys } from '@/lib/query-keys'
import { UserList } from '@/features/users/components/UserList'

export const Route = createFileRoute('/admin/users/')({
  head: () => buildCmsHead(messages.nav.users),
  loader: ({ context: { queryClient } }) => {
    const tenantId = undefined
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.list(tenantId),
      queryFn: () => getUsersFn({ data: { tenantId } }),
    })
    queryClient.prefetchQuery({
      queryKey: queryKeys.roles.list(tenantId),
      queryFn: () => getTenantRolesFn({ data: { tenantId } }),
    })
  },
  component: UsersPage,
})

function UsersPage() {
  return <UserList />
}
