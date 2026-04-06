'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/client'
import { getUsers } from '../queries'
import { deleteUser } from '../actions'
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
} from '@agency/ui'
import { Users, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
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
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [])

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: getUsers,
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      setDeletingUserId(userId)
      const result = await deleteUser(userId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
    onSettled: () => {
      setDeletingUserId(null)
    },
  })

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

  const hasUsers = users && users.length > 0

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
        <div className="divide-y divide-border rounded-lg border border-border">
          {/* Table header */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="flex-1">{messages.users.fullName}</div>
            <div className="w-56">{messages.users.email}</div>
            <div className="w-32">{messages.users.role}</div>
            <div className="hidden lg:block w-32">{messages.users.createdAt}</div>
            <div className="w-20" />
          </div>

          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onEdit={() => setEditingUser(user)}
              onDelete={() => deleteMutation.mutate(user.id)}
              isDeleting={deletingUserId === user.id}
              isCurrentUser={currentUserId === user.id}
            />
          ))}
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
}: {
  user: UserWithRole
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
  isCurrentUser: boolean
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
    <div className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4">
      {/* Name + super admin badge */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {user.full_name || '\u2014'}
          </p>
          {user.is_super_admin && (
            <Badge
              variant="outline"
              className="shrink-0 text-xs bg-red-500/10 text-red-400 border-red-500/20"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              Super Admin
            </Badge>
          )}
        </div>
        {/* Mobile: show email below name */}
        <p className="text-xs text-muted-foreground truncate sm:hidden mt-0.5">
          {user.email}
        </p>
      </div>

      {/* Email — desktop only */}
      <div className="hidden sm:block w-56">
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </div>

      {/* Role — colored badge by role type */}
      <div className="w-32">
        <Badge variant="outline" className={`text-xs ${roleBadgeClasses}`}>
          {roleName ?? '\u2014'}
        </Badge>
      </div>

      {/* Created */}
      <div className="hidden lg:block w-32">
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 w-20 justify-end flex-shrink-0">
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
    </div>
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
