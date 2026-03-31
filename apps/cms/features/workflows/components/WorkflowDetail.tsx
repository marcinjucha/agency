'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { queryKeys } from '@/lib/query-keys'
import { deleteWorkflow, toggleWorkflowActive } from '../actions'
import { getTriggerTypeLabel } from '../utils'
import type { WorkflowWithSteps, TriggerType } from '../types'
import {
  Button,
  Badge,
  Switch,
  Card,
  CardHeader,
  CardContent,
  Label,
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
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

interface WorkflowDetailProps {
  workflow: WorkflowWithSteps
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '\u2014'
  try {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '\u2014'
  }
}

export function WorkflowDetail({ workflow: initialWorkflow }: WorkflowDetailProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [workflow, setWorkflow] = useState(initialWorkflow)

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const result = await toggleWorkflowActive(workflow.id, isActive)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (_result, isActive) => {
      setWorkflow((prev) => ({ ...prev, is_active: isActive }))
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await deleteWorkflow(workflow.id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
      router.push(routes.admin.workflows)
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{workflow.name}</h1>
          {workflow.description && (
            <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={routes.admin.workflowEditor(workflow.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              {messages.workflows.openEditor}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4" />
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
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {messages.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Metadata card */}
      <Card>
        <CardHeader className="pb-4">
          <h2 className="text-base font-semibold">{messages.workflows.detailTitle}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{messages.workflows.status}</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {workflow.is_active ? messages.workflows.active : messages.workflows.inactive}
              </span>
              <Switch
                checked={workflow.is_active}
                onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                disabled={toggleMutation.isPending}
                aria-label={workflow.is_active ? messages.workflows.deactivate : messages.workflows.activate}
              />
            </div>
          </div>

          {/* Trigger type */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{messages.workflows.trigger}</Label>
            <Badge variant="outline" className="text-xs font-normal">
              {getTriggerTypeLabel(workflow.trigger_type as TriggerType)}
            </Badge>
          </div>

          {/* Steps count */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{messages.workflows.stepsCount}</Label>
            <span className="text-sm text-muted-foreground">
              {workflow.steps.length}
            </span>
          </div>

          {/* Created */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{messages.workflows.createdAt}</Label>
            <span className="text-sm text-muted-foreground">
              {formatDateTime(workflow.created_at)}
            </span>
          </div>

          {/* Updated */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{messages.workflows.updatedAt}</Label>
            <span className="text-sm text-muted-foreground">
              {formatDateTime(workflow.updated_at)}
            </span>
          </div>

          {/* Errors */}
          {toggleMutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {toggleMutation.error instanceof Error ? toggleMutation.error.message : messages.workflows.toggleFailed}
            </p>
          )}
          {deleteMutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : messages.workflows.deleteFailed}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
