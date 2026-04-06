'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getRoles } from '../queries'
import { deleteRole } from '../actions'
import type { TenantRoleWithPermissions } from '../types'
import { messages } from '@/lib/messages'
import {
  Button,
  Badge,
  Skeleton,
  ErrorState,
  EmptyState,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@agency/ui'
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react'
import { RoleEditor } from './RoleEditor'

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RoleList() {
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<TenantRoleWithPermissions | null>(null)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)

  const {
    data: roles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: getRoles,
  })

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      setDeletingRoleId(roleId)
      const result = await deleteRole(roleId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
    onSettled: () => {
      setDeletingRoleId(null)
    },
  })

  function handleCreate() {
    setEditingRole(null)
    setEditorOpen(true)
  }

  function handleEdit(role: TenantRoleWithPermissions) {
    setEditingRole(role)
    setEditorOpen(true)
  }

  // --- Loading ---
  if (isLoading) return <RoleListSkeleton />

  // --- Error ---
  if (error) {
    return (
      <ErrorState
        title={messages.roles.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  const hasRoles = roles && roles.length > 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{messages.roles.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{messages.roles.subtitle}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {messages.roles.addRole}
        </Button>
      </div>

      {/* Content */}
      {!hasRoles ? (
        <EmptyState
          icon={Shield}
          title={messages.roles.noRoles}
          description={messages.roles.noRolesDescription}
          variant="card"
          action={
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.roles.addRole}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader className="hidden sm:table-header-group">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wider">{messages.roles.name}</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider w-48 hidden md:table-cell">{messages.roles.description}</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider w-28 text-center">{messages.roles.userCount}</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider w-28 text-center">{messages.roles.permissions}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onEdit={() => handleEdit(role)}
                  onDelete={() => deleteMutation.mutate(role.id)}
                  isDeleting={deletingRoleId === role.id}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Editor dialog */}
      <RoleEditor open={editorOpen} onOpenChange={setEditorOpen} role={editingRole} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Role Row
// ---------------------------------------------------------------------------

function RoleRow({
  role,
  onEdit,
  onDelete,
  isDeleting,
}: {
  role: TenantRoleWithPermissions
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const canDelete = !isDeleting && !role.is_default && role.user_count === 0

  return (
    <TableRow>
      {/* Name + default badge */}
      <TableCell>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{role.name}</p>
          {role.is_default && (
            <Badge
              variant="outline"
              className="shrink-0 text-xs bg-amber-500/10 text-amber-400 border-amber-500/20"
            >
              {messages.roles.defaultRole}
            </Badge>
          )}
        </div>
        {/* Mobile: show description below name */}
        {role.description && (
          <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{role.description}</p>
        )}
      </TableCell>

      {/* Description — desktop only */}
      <TableCell className="hidden md:table-cell w-48">
        <p className="text-sm text-muted-foreground">{role.description || '\u2014'}</p>
      </TableCell>

      {/* User count */}
      <TableCell className="w-28 text-center">
        <Badge variant="outline" className="text-xs">
          {role.user_count}
        </Badge>
      </TableCell>

      {/* Permission count */}
      <TableCell className="w-28 text-center">
        <span className="text-xs text-muted-foreground">
          {messages.roles.permissionCount((role.permissions ?? []).length)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-20 text-right">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            aria-label={messages.roles.editRole}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={!canDelete}
                        aria-label={messages.roles.deleteRole}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{messages.roles.deleteRole}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {messages.roles.deleteConfirm}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {messages.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </span>
              </TooltipTrigger>
              {(role.is_default || role.user_count > 0) && (
                <TooltipContent>
                  <p>
                    {role.is_default
                      ? messages.roles.cannotDeleteDefault
                      : messages.roles.cannotDeleteWithUsers}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RoleListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72 mt-1" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-28 flex-1" />
            <Skeleton className="hidden md:block h-4 w-36" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
