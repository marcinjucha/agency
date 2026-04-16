import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { UserList } from '@/features/users/components/UserList'

export const Route = createFileRoute('/admin/users/')({
  head: () => buildCmsHead(messages.nav.users),
  component: UsersPage,
})

function UsersPage() {
  return <UserList />
}
