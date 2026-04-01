'use client'

import Link from 'next/link'
import { Card, CardContent } from '@agency/ui'
import { useRouter } from 'next/navigation'
import { Mail, ChevronRight } from 'lucide-react'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { TEMPLATE_TYPE_LABELS, type EmailTemplateType, type EmailTemplate } from '@/features/email/types'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'

interface EmailTemplateListClientProps {
  templates: EmailTemplate[]
}

export function EmailTemplateListClient({ templates }: EmailTemplateListClientProps) {
  const [viewMode, setViewMode] = useViewMode('email-templates-view-mode', 'grid')
  const router = useRouter()

  const allTypes = Object.entries(TEMPLATE_TYPE_LABELS) as [EmailTemplateType, string][]

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-end">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {allTypes.map(([type, label]) => {
            const template = templates.find((t) => t.type === type)
            return (
              <div
                key={type}
                role="button"
                tabIndex={0}
                className="group cursor-pointer"
                onClick={() => router.push(routes.admin.emailTemplate(type))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(routes.admin.emailTemplate(type))
                  }
                }}
              >
                <Card className="overflow-hidden transition-transform hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring h-full">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {template
                        ? `${messages.email.subjectPrefix} ${template.subject}`
                        : messages.email.noTemplate}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          template?.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {template?.is_active ? messages.email.active : messages.email.inactive}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="grid gap-4">
          {allTypes.map(([type, label]) => {
            const template = templates.find((t) => t.type === type)
            return (
              <Link key={type} href={routes.admin.emailTemplate(type)}>
                <Card className="flex items-center justify-between p-5 hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">
                        {template ? `${messages.email.subjectPrefix} ${template.subject}` : messages.email.noTemplate}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
