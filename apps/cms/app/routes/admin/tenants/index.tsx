import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getTenantsFn } from '@/features/tenants/server'
import { queryKeys } from '@/lib/query-keys'
import { TenantList } from '@/features/tenants/components/TenantList'

export const Route = createFileRoute('/admin/tenants/')({
  head: () => buildCmsHead(messages.tenants.title),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.tenants.all,
      queryFn: async () => {
        const data = await getTenantsFn()
        return data
      },
    })
  },
  component: TenantsPage,
})

function TenantsPage() {
  return <TenantList />
}
