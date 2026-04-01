import { getEmailTemplates } from '@/features/email/queries.server'
import { messages } from '@/lib/messages'
import { EmailTemplateListClient } from './EmailTemplateListClient'

export async function EmailTemplateList() {
  const templates = await getEmailTemplates()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{messages.email.templatesTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.email.templatesDescription}
        </p>
      </div>

      <EmailTemplateListClient templates={templates} />
    </div>
  )
}
