import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ThemeEditor } from '@/features/themes/components/ThemeEditor'

export const Route = createFileRoute('/admin/themes/new')({
  head: () => buildCmsHead(messages.themes.newThemeTitle),
  component: NewThemePage,
})

function NewThemePage() {
  return <ThemeEditor />
}
