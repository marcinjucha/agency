import { createFileRoute, Link } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { getEmailTemplateFn } from '@/features/email/server'
import { queryKeys } from '@/lib/query-keys'
import { TEMPLATE_TYPE_LABELS, type EmailTemplateType } from '@/features/email/types'
import { EmailTemplateEditor } from '@/features/email/components/EmailTemplateEditor'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const Route = createFileRoute('/admin/email-templates/$type')({
  head: ({ params }) => {
    const label = TEMPLATE_TYPE_LABELS[params.type as EmailTemplateType] ?? params.type
    return buildCmsHead(label)
  },
  component: EmailTemplatePage,
})

function EmailTemplatePage() {
  const { type } = Route.useParams()
  const { data: template } = useQuery({
    queryKey: queryKeys.email.template(type),
    queryFn: () => getEmailTemplateFn({ data: { type } }),
  })

  return (
    <div className="space-y-6">
      <Link to={routes.admin.emailTemplates}>
        <Button variant="ghost" className="-ml-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {messages.nav.emailTemplates}
        </Button>
      </Link>
      <EmailTemplateEditor templateType={type} initialTemplate={template ?? null} />
    </div>
  )
}
