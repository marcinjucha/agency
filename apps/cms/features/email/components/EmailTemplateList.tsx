import Link from 'next/link'
import { Card } from '@agency/ui'
import { getEmailTemplates } from '@/features/email/queries.server'
import { TEMPLATE_TYPE_LABELS } from '@/features/email/types'
import { Mail, ChevronRight } from 'lucide-react'

export async function EmailTemplateList() {
  const templates = await getEmailTemplates()

  const allTypes = Object.entries(TEMPLATE_TYPE_LABELS) as [
    keyof typeof TEMPLATE_TYPE_LABELS,
    string,
  ][]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Szablony email</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Dostosuj wygląd automatycznych wiadomości email do swoich klientów.
        </p>
      </div>

      <div className="grid gap-4">
        {allTypes.map(([type, label]) => {
          const template = templates.find((t) => t.type === type)
          return (
            <Link key={type} href={`/admin/email-templates/${type}`}>
              <Card className="flex items-center justify-between p-5 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {template ? `Temat: ${template.subject}` : 'Brak szablonu — zostanie użyty domyślny'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
