'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { queryKeys } from '@/lib/query-keys'
import { getWorkflows } from '../queries'
import { deleteWorkflowFn, toggleWorkflowActiveFn } from '../server'
import { getTriggerTypeLabel, formatDate } from '../utils'
import type { WorkflowListItem, TriggerType } from '../types'
import {
  Button,
  Badge,
  Switch,
  Skeleton,
  ErrorState,
  EmptyState,
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
import { Zap, Plus, Pencil, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'
import { CreateWorkflowDialog } from './CreateWorkflowDialog'
import { WorkflowCard } from './WorkflowCard'
import { WorkflowTemplateSelector } from './WorkflowTemplateSelector'

function TriggerBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="text-xs font-normal">
      {getTriggerTypeLabel(type as TriggerType)}
    </Badge>
  )
}

interface WorkflowListProps {
  /** Pre-loaded workflow list from route loader — used as initialData for the query */
  initialWorkflows?: WorkflowListItem[]
}

export function WorkflowList({ initialWorkflows }: WorkflowListProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useViewMode('workflow-view-mode', 'grid')

  const {
    data: workflows,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.workflows.list,
    queryFn: getWorkflows,
    initialData: initialWorkflows,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteWorkflowFn({ data: { id } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const result = await toggleWorkflowActiveFn({ data: { id, isActive } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all })
    },
  })

  if (isLoading) return <WorkflowListSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.workflows.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{messages.workflows.pageTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{messages.workflows.pageDescription}</p>
          </div>
        </div>
        <WorkflowTemplateSelector workflowCount={0} />
        <EmptyState
          icon={Zap}
          title={messages.workflows.noWorkflows}
          description={messages.workflows.noWorkflowsDescription}
          variant="card"
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.workflows.newWorkflow}
            </Button>
          }
        />
        <CreateWorkflowDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{messages.workflows.pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{messages.workflows.pageDescription}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {messages.workflows.newWorkflow}
          </Button>
        </div>
      </div>

      <WorkflowTemplateSelector workflowCount={workflows.length} />

      {viewMode === 'list' ? (
        /* Table */
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.columnName}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.columnTrigger}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.columnActive}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {messages.workflows.columnUpdated}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <span className="sr-only">{messages.workflows.columnActions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === workflow.id}
                  isToggling={toggleMutation.isPending && toggleMutation.variables?.id === workflow.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onDelete={(id) => deleteMutation.mutate(id)}
              onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === workflow.id}
              isToggling={toggleMutation.isPending && toggleMutation.variables?.id === workflow.id}
            />
          ))}
        </div>
      )}

      <CreateWorkflowDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}

// --- Row ---

interface WorkflowRowProps {
  workflow: WorkflowListItem
  onDelete: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  isDeleting: boolean
  isToggling: boolean
}

function WorkflowRow({ workflow, onDelete, onToggle, isDeleting, isToggling }: WorkflowRowProps) {
  const router = useRouter()

  return (
    <tr
      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/50 cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(routes.admin.workflow(workflow.id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(routes.admin.workflow(workflow.id))
        }
      }}
    >
      <td className="px-4 py-3">
        <span className="font-medium text-foreground">
          {workflow.name}
        </span>
        {workflow.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {workflow.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <TriggerBadge type={workflow.trigger_type} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={workflow.is_active}
          onCheckedChange={(checked) => onToggle(workflow.id, checked)}
          disabled={isToggling}
          aria-label={workflow.is_active ? messages.workflows.deactivate : messages.workflows.activate}
        />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(workflow.updated_at)}
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Link href={routes.admin.workflow(workflow.id)}>
            <Button variant="ghost" size="sm" aria-label={messages.common.edit}>
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <DeleteWorkflowButton
            workflow={workflow}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </div>
      </td>
    </tr>
  )
}

// --- Delete button with AlertDialog ---

function DeleteWorkflowButton({
  workflow,
  onDelete,
  isDeleting,
}: {
  workflow: WorkflowListItem
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  return (
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
  )
}

// --- Skeleton ---

function WorkflowListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="rounded-lg border border-border">
        {/* Header row */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <div className="ml-auto flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
