import { createFileRoute, Link } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { getEmailTemplateFn } from '@/features/email/server'
import { queryKeys } from '@/lib/query-keys'
import { EmailTemplateEditor } from '@/features/email/components/EmailTemplateEditor'
import { useQuery } from '@tanstack/react-query'
import { Button, EmptyState, ErrorState, LoadingState } from '@agency/ui'
import { ArrowLeft, Mail } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const Route = createFileRoute('/admin/email-templates/$type')({
  // Head shows raw slug as fallback — the `label` field from the DB row will
  // be wired in Iter 3 once the editor exposes it. The list view already shows
  // friendly labels.
  head: ({ params }) => buildCmsHead(params.type),
  component: EmailTemplatePage,
})

function EmailTemplatePage() {
  const { type } = Route.useParams()
  const { data: template, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.email.template(type),
    queryFn: () => getEmailTemplateFn({ data: { type } }),
  })

  // Loading / error / empty states render inside admin layout's p-8 wrapper.
  // The editor itself escapes the parent padding with `-m-8` + `h-[calc(100vh-...)]`
  // to claim the full main-area viewport for the 3-column layout.
  if (isLoading) {
    return <LoadingState variant="skeleton-card" rows={6} />
  }
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : messages.common.unknownError}
        onRetry={() => void refetch()}
      />
    )
  }
  if (template == null) {
    return (
      <EmptyState
        icon={Mail}
        title={messages.email.templateNotFound}
        description={messages.email.templateNotFoundDescription}
        variant="card"
        action={
          <Link to={routes.admin.emailTemplates}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {messages.nav.emailTemplates}
            </Button>
          </Link>
        }
      />
    )
  }

  // Editor is full-bleed inside <main>. We negate the admin layout's `p-8`
  // padding with `-m-8` so the topbar/columns reach the sidebar edge, and
  // pin the viewport with `h-[calc(100vh-0px)]` to fill the available height.
  // (admin layout's <main> already has `h-screen` via parent flex.)
  return (
    <div className="-m-8 relative h-[calc(100vh-0px)] overflow-hidden">
      <EmailTemplateEditor templateType={type} initialTemplate={template} />
    </div>
  )
}
