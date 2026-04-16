import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getEmailTemplatesFn } from '@/features/email/server'
import { queryKeys } from '@/lib/query-keys'
import { EmailTemplateListClient } from '@/features/email/components/EmailTemplateListClient'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/admin/email-templates/')({
  head: () => buildCmsHead(messages.nav.emailTemplates),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.email.templates,
      queryFn: () => getEmailTemplatesFn(),
    })
  },
  component: EmailTemplatesPage,
})

function EmailTemplatesPage() {
  const { data: templates = [] } = useQuery({
    queryKey: queryKeys.email.templates,
    queryFn: () => getEmailTemplatesFn(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {messages.email.templatesTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.email.templatesDescription}
        </p>
      </div>

      <EmailTemplateListClient templates={templates} />
    </div>
  )
}
