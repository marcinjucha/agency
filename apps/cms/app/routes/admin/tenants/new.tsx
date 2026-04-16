import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { TenantForm } from '@/features/tenants/components/TenantForm'

export const Route = createFileRoute('/admin/tenants/new')({
  head: () => buildCmsHead(messages.tenants.createButton),
  component: NewTenantPage,
})

function NewTenantPage() {
  return <TenantForm />
}
