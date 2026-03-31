'use client'

import { useRouter } from 'next/navigation'
import {
  Badge,
  Switch,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@agency/ui'
import { Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { getTriggerTypeLabel, formatDate } from '../utils'
import { NODE_TYPE_CONFIGS, TRIGGER_SUBTYPE_CONFIGS } from './nodes/node-registry'
import type { WorkflowListItem, TriggerType } from '../types'

function getTriggerBorderColor(triggerType: string): string {
  const config = TRIGGER_SUBTYPE_CONFIGS[triggerType] ?? NODE_TYPE_CONFIGS.trigger
  // Extract just the border-l color (e.g., "border-l-orange-500")
  return config?.borderColor ?? 'border-l-4 border-l-orange-500'
}

interface WorkflowCardProps {
  workflow: WorkflowListItem
  onDelete: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isDeleting: boolean
  isToggling: boolean
}

export function WorkflowCard({
  workflow,
  onDelete,
  onToggle,
  isDeleting,
  isToggling,
}: WorkflowCardProps) {
  const router = useRouter()
  const borderColor = getTriggerBorderColor(workflow.trigger_type)

  return (
    <div
      className={`bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors ${borderColor}`}
      role="link"
      tabIndex={0}
      onClick={() => router.push(routes.admin.workflowEditor(workflow.id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(routes.admin.workflowEditor(workflow.id))
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{workflow.name}</p>
          {workflow.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {workflow.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active indicator dot */}
          <span
            className={`h-2 w-2 rounded-full ${
              workflow.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            }`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-normal">
          {getTriggerTypeLabel(workflow.trigger_type as TriggerType)}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDate(workflow.updated_at)}
        </span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={workflow.is_active}
            onCheckedChange={(checked) => onToggle(workflow.id, checked)}
            disabled={isToggling}
            aria-label={workflow.is_active ? messages.workflows.deactivate : messages.workflows.activate}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                aria-label={messages.common.delete}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.workflows.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {messages.workflows.deleteConfirmDescription(workflow.name)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(workflow.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {messages.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
