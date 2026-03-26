import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { routes } from '@/lib/routes'
import { getEmailTemplate } from '@/features/email/queries.server'
import { EmailTemplateEditor } from '@/features/email/components/EmailTemplateEditor'
import { TEMPLATE_TYPE_LABELS } from '@/features/email/types'

interface Props {
  params: Promise<{ type: string }>
}

export async function generateMetadata({ params }: Props) {
  const { type } = await params
  const label = TEMPLATE_TYPE_LABELS[type as keyof typeof TEMPLATE_TYPE_LABELS]
  return { title: `${label ?? 'Szablon'} | Halo-Efekt CMS` }
}

export default async function EmailTemplateDetailPage({ params }: Props) {
  const { type } = await params

  if (!(type in TEMPLATE_TYPE_LABELS)) {
    notFound()
  }

  const template = await getEmailTemplate(type)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={routes.admin.emailTemplates}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Szablony email
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {TEMPLATE_TYPE_LABELS[type as keyof typeof TEMPLATE_TYPE_LABELS]}
        </h1>
      </div>

      <EmailTemplateEditor templateType={type} initialTemplate={template} />
    </div>
  )
}
