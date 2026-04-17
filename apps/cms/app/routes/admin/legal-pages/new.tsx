import { createFileRoute, Link } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { CreateLegalPageForm } from '@/features/legal-pages/components/CreateLegalPageForm'

export const Route = createFileRoute('/admin/legal-pages/new')({
  head: () => buildCmsHead(messages.legalPages.createTitle),
  component: NewLegalPagePage,
})

function NewLegalPagePage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          to={routes.admin.legalPages}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; {messages.common.back}
        </Link>
        <h1 className="text-3xl font-bold text-foreground mt-2">
          {messages.legalPages.createTitle}
        </h1>
      </div>
      <CreateLegalPageForm />
    </div>
  )
}
