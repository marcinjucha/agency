import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button, Card, CardContent, EmptyState } from '@agency/ui'
import { Mail, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { EmailTemplate } from '@/features/email/types'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import { DeleteTemplateDialog } from './DeleteTemplateDialog'

interface EmailTemplateListClientProps {
  templates: EmailTemplate[]
}

export function EmailTemplateListClient({ templates }: EmailTemplateListClientProps) {
  const [viewMode, setViewMode] = useViewMode('email-templates-view-mode', 'grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null)
  const router = useRouter()
  const navigate = (type: string) =>
    router.navigate({ to: '/admin/email-templates/$type', params: { type } })

  // List entries derived directly from DB rows — slugs are tenant-defined now.
  // `label ?? type` is a defensive fallback; the column is NOT NULL post-migration.
  const entries = templates.map((t) => ({
    type: t.type,
    label: t.label ?? t.type,
    template: t,
  }))

  // Empty state — no toggle, no grid; one CTA to create the first template.
  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Mail}
          title={messages.email.emptyTitle}
          description={messages.email.emptyDescription}
          variant="card"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.email.emptyAction}
            </Button>
          }
        />
        <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: view toggle (left) + create button (right) — matches WorkflowList */}
      <div className="flex items-center justify-end gap-3">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {messages.email.createNew}
        </Button>
      </div>

      {viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {entries.map(({ type, label, template }) => (
            <div
              key={type}
              role="button"
              tabIndex={0}
              className="group cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => navigate(type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(type)
                }
              }}
            >
              <Card className="relative overflow-hidden transition-transform group-hover:-translate-y-0.5 h-full">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                        {label}
                      </p>
                      <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground line-clamp-1">
                        {type}
                      </p>
                    </div>
                    {/* Delete button — stopPropagation in handler avoids card navigation */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(template)
                      }}
                      aria-label={messages.email.deleteAction}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
          ))}
        </div>
      ) : (
        /* List view — uses role="link" div instead of <Link> wrapping <Button>
           to avoid nested-interactive antipattern (validator P0-2). */
        <div className="grid gap-4">
          {entries.map(({ type, label, template }) => (
            <div
              key={type}
              role="link"
              tabIndex={0}
              onClick={() => navigate(type)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(type)
                }
              }}
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground line-clamp-1">
                      {type}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template
                        ? `${messages.email.subjectPrefix} ${template.subject}`
                        : messages.email.noTemplate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(template)
                    }}
                    aria-label={messages.email.deleteAction}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DeleteTemplateDialog
        template={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
