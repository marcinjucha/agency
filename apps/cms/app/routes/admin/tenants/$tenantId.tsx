import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getTenantFn } from '@/features/tenants/server'
import { queryKeys } from '@/lib/query-keys'
import { TenantForm } from '@/features/tenants/components/TenantForm'

export const Route = createFileRoute('/admin/tenants/$tenantId')({
  head: () => buildCmsHead(messages.tenants.editButton),
  loader: ({ context: { queryClient }, params: { tenantId } }) =>
    queryClient.ensureQueryData({
      queryKey: queryKeys.tenants.detail(tenantId),
      queryFn: async () => {
        const data = await getTenantFn({ data: { id: tenantId } })
        return data
      },
    }),
  component: TenantDetailPage,
})

function TenantDetailPage() {
  const { tenantId } = Route.useParams()
  return <TenantForm tenantId={tenantId} />
}
