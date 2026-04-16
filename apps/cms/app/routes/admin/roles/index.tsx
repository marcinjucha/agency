import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { RoleList } from '@/features/roles/components/RoleList'

export const Route = createFileRoute('/admin/roles/')({
  head: () => buildCmsHead(messages.nav.roles),
  component: RolesPage,
})

function RolesPage() {
  return <RoleList />
}
