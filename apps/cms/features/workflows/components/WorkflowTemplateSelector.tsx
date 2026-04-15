

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button, Badge } from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { createWorkflowFromTemplateFn } from '../server'
import { WORKFLOW_TEMPLATES } from '../templates/workflow-templates'
import { getTriggerTypeLabel } from '../utils'
import type { TriggerType } from '../types'

const STORAGE_KEY = 'workflow-templates-visible'

interface WorkflowTemplateSelectorProps {
  workflowCount: number
}

export function WorkflowTemplateSelector({ workflowCount }: WorkflowTemplateSelectorProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [errorTemplateId, setErrorTemplateId] = useState<string | null>(null)

  // Initialise visibility from localStorage, default: visible when < 3 workflows
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsVisible(stored === 'true')
    } else {
      setIsVisible(workflowCount < 3)
    }
  }, [workflowCount])

  const handleVisibilityToggle = () => {
    const next = !isVisible
    setIsVisible(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const mutation = useMutation({
    mutationFn: async (templateId: string) => {
      setActiveTemplateId(templateId)
      setErrorTemplateId(null)
      const result = await createWorkflowFromTemplateFn({ data: { templateId } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (result) => {
      setActiveTemplateId(null)
      if (result.data?.id) {
        router.push(routes.admin.workflowEditor(result.data.id))
      }
    },
    onError: (_err, templateId) => {
      setActiveTemplateId(null)
      setErrorTemplateId(templateId)
    },
  })

  return (
    <section aria-label={messages.workflows.templatesSectionTitle} className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {messages.workflows.templatesSectionTitle}
        </h2>
        <button
          type="button"
          onClick={handleVisibilityToggle}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={isVisible}
          aria-controls="workflow-templates-grid"
        >
          {isVisible ? (
            <>
              {messages.workflows.templateHide}
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              {messages.workflows.templateShow}
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Template cards */}
      {isVisible && (
        <div
          id="workflow-templates-grid"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {WORKFLOW_TEMPLATES.map((template) => {
            const isPending = mutation.isPending && activeTemplateId === template.id
            const hasError = errorTemplateId === template.id

            return (
              <div
                key={template.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                {/* Icon + name */}
                <div className="flex flex-col gap-2">
                  <span
                    className="text-2xl leading-none select-none"
                    aria-hidden="true"
                  >
                    {template.icon}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {messages.workflows.templates[template.id as keyof typeof messages.workflows.templates]?.name ?? template.name}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {messages.workflows.templates[template.id as keyof typeof messages.workflows.templates]?.description ?? template.description}
                    </p>
                  </div>
                </div>

                {/* Trigger badge */}
                <Badge variant="outline" className="self-start text-xs font-normal">
                  {getTriggerTypeLabel(template.trigger_type as TriggerType)}
                </Badge>

                {/* Error message */}
                {hasError && (
                  <p role="alert" className="text-xs text-destructive">
                    {messages.workflows.templateCreateFailed}
                  </p>
                )}

                {/* CTA */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-full"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(template.id)}
                  aria-label={`${messages.workflows.useTemplate}: ${messages.workflows.templates[template.id as keyof typeof messages.workflows.templates]?.name ?? template.name}`}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>{messages.workflows.creating}</span>
                    </>
                  ) : (
                    messages.workflows.useTemplate
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-border" role="separator" />
    </section>
  )
}
