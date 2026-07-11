import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { ThemeLibrary } from '@/features/themes/components/ThemeLibrary'

export const Route = createFileRoute('/admin/themes/')({
  head: () => buildCmsHead(messages.themes.title),
  component: ThemesPage,
})

function ThemesPage() {
  return <ThemeLibrary />
}
