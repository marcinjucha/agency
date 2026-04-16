import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { getEmailTemplateFn } from '@/features/email/server'
import { queryKeys } from '@/lib/query-keys'
import { TEMPLATE_TYPE_LABELS, type EmailTemplateType } from '@/features/email/types'
import { EmailTemplateEditor } from '@/features/email/components/EmailTemplateEditor'
import { useQuery } from '@tanstack/react-query'

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

  return <EmailTemplateEditor templateType={type} initialTemplate={template ?? null} />
}
