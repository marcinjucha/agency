import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { TenantList } from '@/features/tenants/components/TenantList'

export const Route = createFileRoute('/admin/tenants/')({
  head: () => buildCmsHead(messages.tenants.title),
  component: TenantsPage,
})

function TenantsPage() {
  return <TenantList />
}
