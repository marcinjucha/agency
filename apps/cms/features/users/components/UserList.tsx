

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/client'
import { getUsersFn } from '../server'
import { deleteUserFn } from '../server'
import type { UserWithRole } from '../types'
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
import { Users, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { usePermissions } from '@/contexts/permissions-context'
import { TenantScopeBar } from '@/features/tenants/components/TenantScopeBar'
import { useTenantScope } from '@/features/tenants/hooks/use-tenant-scope'
import { AddUserDialog } from './AddUserDialog'
import { EditUserDialog } from './EditUserDialog'

// --- Role badge color mapping (consistent with Status Badge Colors in design system) ---

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  member: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function getRoleBadgeClassName(role: string | null): string {
  if (!role) return ''
  return ROLE_BADGE_STYLES[role.toLowerCase()] ?? ''
}

export function UserList() {
  const queryClient = useQueryClient()
  const { isSuperAdmin: viewerIsSuperAdmin } = usePermissions()
  const { selectedTenantId } = useTenantScope()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [])

  // Super admins need explicit tenant filter (RLS uses original tenant, not cookie override)
  const queryTenantId = viewerIsSuperAdmin ? selectedTenantId : undefined

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.users.list(queryTenantId),
    queryFn: () => getUsersFn({ data: { tenantId: queryTenantId ?? undefined } }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      setDeletingUserId(userId)
      const result = await deleteUserFn({ data: { userId } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
      ])
    },
    onSettled: () => {
      setDeletingUserId(null)
    },
  })

  // Non-super-admins should not see super admin users in the list
  const visibleUsers = useMemo(
    () => (viewerIsSuperAdmin ? users : users?.filter((u) => !u.is_super_admin)),
    [users, viewerIsSuperAdmin],
  )

  const hasUsers = visibleUsers && visibleUsers.length > 0

  if (isLoading) return <UserListSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.users.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{messages.users.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{messages.users.subtitle}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {messages.users.addUser}
        </Button>
      </div>

      {/* Tenant scope selector — super admin only */}
      <TenantScopeBar />

      {/* User table */}
      {!hasUsers ? (
        <EmptyState
          icon={Users}
          title={messages.users.noUsers}
          description={messages.users.noUsersDescription}
          variant="card"
          action={
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.users.addUser}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader className="hidden sm:table-header-group">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wider">{messages.users.fullName}</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider">{messages.users.email}</TableHead>
                {viewerIsSuperAdmin && (
                  <TableHead className="text-xs font-medium uppercase tracking-wider whitespace-nowrap hidden md:table-cell">{messages.users.tenant}</TableHead>
                )}
                <TableHead className="text-xs font-medium uppercase tracking-wider whitespace-nowrap">{messages.users.role}</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">{messages.users.createdAt}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers!.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={() => setEditingUser(user)}
                  onDelete={() => deleteMutation.mutate(user.id)}
                  isDeleting={deletingUserId === user.id}
                  isCurrentUser={currentUserId === user.id}
                  viewerIsSuperAdmin={viewerIsSuperAdmin}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AddUserDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditUserDialog
        user={editingUser}
        open={editingUser !== null}
        onOpenChange={(open) => { if (!open) setEditingUser(null) }}
      />
    </div>
  )
}

// --- User row ---

function UserRow({
  user,
  onEdit,
  onDelete,
  isDeleting,
  isCurrentUser,
  viewerIsSuperAdmin,
}: {
  user: UserWithRole
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isCurrentUser: boolean
  viewerIsSuperAdmin: boolean
}) {
  const formattedDate = new Date(user.created_at).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const roleName = user.tenant_role?.name ?? user.role
  const roleBadgeClasses = getRoleBadgeClassName(user.role)
  const canDelete = !isDeleting && !user.is_super_admin && !isCurrentUser

  return (
    <TableRow>
      {/* Name + super admin badge */}
      <TableCell>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {user.full_name || '\u2014'}
          </p>
          {viewerIsSuperAdmin && user.is_super_admin && (
            <Badge
              variant="outline"
              className="shrink-0 text-xs bg-red-500/10 text-red-400 border-red-500/20"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              {messages.users.superAdmin}
            </Badge>
          )}
        </div>
        {/* Mobile: show email below name */}
        <p className="text-xs text-muted-foreground truncate sm:hidden mt-0.5">
          {user.email}
        </p>
      </TableCell>

      {/* Email — desktop only */}
      <TableCell className="hidden sm:table-cell">
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </TableCell>

      {/* Tenant — super admin only */}
      {viewerIsSuperAdmin && (
        <TableCell className="hidden md:table-cell whitespace-nowrap">
          <span className="text-sm text-muted-foreground">{user.tenant?.name ?? '\u2014'}</span>
        </TableCell>
      )}

      {/* Role — colored badge by role type */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className={`text-xs ${roleBadgeClasses}`}>
          {roleName ?? '\u2014'}
        </Badge>
      </TableCell>

      {/* Created */}
      <TableCell className="hidden lg:table-cell whitespace-nowrap">
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            aria-label={messages.users.editUser}
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
                        aria-label={messages.users.deleteUser}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{messages.users.deleteUser}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {messages.users.deleteConfirm}
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
              {(user.is_super_admin || isCurrentUser) && (
                <TooltipContent>
                  <p>
                    {user.is_super_admin
                      ? messages.users.cannotDeleteSuperAdminTooltip
                      : messages.users.cannotDeleteSelf}
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

// --- Skeleton ---

function UserListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="hidden sm:block h-4 w-44" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="hidden lg:block h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
