

import Link from 'next/link'
import { Button, Switch, Label, Badge } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { getTriggerTypeLabel } from '../utils'
import type { TriggerType } from '../types'

interface WorkflowEditorHeaderProps {
  workflowId: string
  workflowName: string
  triggerType: string
  isActive: boolean
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onToggleActive: (active: boolean) => void
}

export function WorkflowEditorHeader({
  workflowId,
  workflowName,
  triggerType,
  isActive,
  isDirty,
  isSaving,
  onSave,
  onToggleActive,
}: WorkflowEditorHeaderProps) {
  return (
    <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <Link
          href={routes.admin.workflows}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{messages.workflows.backToWorkflows}</span>
        </Link>
        <span className="font-medium text-foreground">{workflowName}</span>
        <Badge variant="outline" className="text-xs font-normal">
          {getTriggerTypeLabel(triggerType as TriggerType)}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        {isDirty && (
          <span className="text-xs text-muted-foreground">
            {messages.workflows.editor.unsavedChanges}
          </span>
        )}

        <div className="flex items-center gap-2">
          <Switch
            id="workflow-active"
            checked={isActive}
            onCheckedChange={onToggleActive}
          />
          <Label htmlFor="workflow-active" className="text-sm cursor-pointer">
            {isActive ? messages.workflows.active : messages.workflows.inactive}
          </Label>
        </div>

        <Button
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? messages.workflows.editor.saving : messages.workflows.editor.save}
        </Button>
      </div>
    </div>
  )
}
