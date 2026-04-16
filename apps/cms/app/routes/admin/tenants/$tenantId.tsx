import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { TenantForm } from '@/features/tenants/components/TenantForm'

export const Route = createFileRoute('/admin/tenants/$tenantId')({
  head: () => buildCmsHead(messages.tenants.editButton),
  component: TenantDetailPage,
})

function TenantDetailPage() {
  const { tenantId } = Route.useParams()
  return <TenantForm tenantId={tenantId} />
}
