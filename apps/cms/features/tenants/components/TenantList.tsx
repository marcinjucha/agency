import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { getTenantsFn, deactivateTenantFn, deleteTenantFn } from '../server'
import type { TenantListItem, SubscriptionStatus } from '../types'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@agency/ui'
import { Building2, Plus, Pencil, XCircle, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

// ---------------------------------------------------------------------------
// Status badge styles (follows design system Status Badge Colors)
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES: Record<SubscriptionStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TenantList() {
  const queryClient = useQueryClient()
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    data: tenants,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tenants.all,
    queryFn: () => getTenantsFn(),
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeactivatingId(id)
      const result = await deactivateTenantFn({ data: { id } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
    onError: (error) => {
      setDeactivateError(error instanceof Error ? error.message : messages.tenants.deactivateFailed)
    },
    onSettled: () => {
      setDeactivatingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id)
      const result = await deleteTenantFn({ data: { id } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
    onError: (error) => {
      setDeleteError(error instanceof Error ? error.message : messages.tenants.deleteFailed)
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

  const hasTenants = tenants && tenants.length > 0

  // --- Loading state ---
  if (isLoading) return <TenantListSkeleton />

  // --- Error state ---
  if (error) {
    return (
      <ErrorState
        title={messages.tenants.loadFailed}
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
          <h1 className="text-2xl font-bold text-foreground">{messages.tenants.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{messages.tenants.subtitle}</p>
        </div>
        <Button asChild>
          <Link to={routes.admin.tenantNew}>
            <Plus className="mr-2 h-4 w-4" />
            {messages.tenants.createButton}
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {!hasTenants ? (
        <EmptyState
          icon={Building2}
          title={messages.tenants.noTenants}
          description={messages.tenants.noTenantsDescription}
          variant="card"
          action={
            <Button asChild>
              <Link to={routes.admin.tenantNew}>
                <Plus className="mr-2 h-4 w-4" />
                {messages.tenants.createButton}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
        {deactivateError && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {deactivateError}
            <button onClick={() => setDeactivateError(null)} className="ml-2 underline">{messages.common.cancel}</button>
          </div>
        )}
        {deleteError && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {deleteError}
            <button onClick={() => setDeleteError(null)} className="ml-2 underline">{messages.common.cancel}</button>
          </div>
        )}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader className="hidden sm:table-header-group">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wider">
                  {messages.tenants.name}
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                  {messages.tenants.email}
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider whitespace-nowrap">
                  {messages.tenants.status}
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                  {messages.tenants.features}
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants!.map((tenant) => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  isDeactivating={deactivatingId === tenant.id}
                  isDeleting={deletingId === tenant.id}
                  onDeactivate={() => deactivateMutation.mutate(tenant.id)}
                  onDelete={() => deleteMutation.mutate(tenant.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tenant Row
// ---------------------------------------------------------------------------

function TenantRow({
  tenant,
  isDeactivating,
  isDeleting,
  onDeactivate,
  onDelete,
}: {
  tenant: TenantListItem
  isDeactivating: boolean
  isDeleting: boolean
  onDeactivate: () => void
  onDelete: () => void
}) {
  const featureCount = tenant.enabled_features.length
  const isCancelled = tenant.subscription_status === 'cancelled'
  const statusLabel = messages.tenants.statusLabels[tenant.subscription_status]
  const badgeClasses = STATUS_BADGE_STYLES[tenant.subscription_status]

  return (
    <TableRow>
      {/* Name */}
      <TableCell>
        <p className="text-sm font-medium text-foreground">{tenant.name}</p>
        {/* Mobile: show email below name */}
        <p className="text-xs text-muted-foreground truncate md:hidden mt-0.5">
          {tenant.email}
        </p>
      </TableCell>

      {/* Email — desktop only */}
      <TableCell className="hidden md:table-cell">
        <p className="text-sm text-muted-foreground truncate">{tenant.email}</p>
      </TableCell>

      {/* Status */}
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className={`text-xs ${badgeClasses}`}>
          {statusLabel}
        </Badge>
      </TableCell>

      {/* Feature count — desktop only */}
      <TableCell className="hidden lg:table-cell whitespace-nowrap">
        <span className="text-sm text-muted-foreground">{featureCount}</span>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            asChild
            aria-label={messages.tenants.editButton}
          >
            <Link to={routes.admin.tenant(tenant.id)}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>

          {!isCancelled && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  disabled={isDeactivating}
                  aria-label={messages.tenants.deactivateTitle}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{messages.tenants.deactivateTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {messages.tenants.deactivateDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeactivate}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {messages.tenants.deactivateConfirmButton}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
                aria-label={messages.tenants.deleteTitle}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.tenants.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {messages.tenants.deleteDescription}
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
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TenantListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-36 flex-1" />
            <Skeleton className="hidden md:block h-4 w-44" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="hidden lg:block h-4 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
