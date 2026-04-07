'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { queryKeys } from '@/lib/query-keys'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { tenantSchema, type TenantFormValues } from '../validation'
import { SUBSCRIPTION_STATUSES, type TenantFormData } from '../types'
import { getTenant } from '../queries'
import { createTenant, updateTenant } from '../actions'
import type { PermissionKey } from '@/lib/permissions'
import { FeatureFlagSelector } from './FeatureFlagSelector'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  ErrorState,
} from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantFormProps {
  tenantId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TenantForm({ tenantId }: TenantFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditing = !!tenantId

  // Fetch existing tenant for edit mode
  const {
    data: tenant,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tenants.detail(tenantId!),
    queryFn: () => getTenant(tenantId!),
    enabled: isEditing,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      domain: '',
      subscription_status: 'trial',
      enabled_features: ['dashboard'],
    },
  })

  // Reset form when tenant data loads
  useEffect(() => {
    if (tenant) {
      reset({
        name: tenant.name,
        email: tenant.email,
        domain: tenant.domain ?? '',
        subscription_status: tenant.subscription_status,
        enabled_features: tenant.enabled_features,
      })
    }
  }, [tenant, reset])

  const mutation = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      const payload: TenantFormData = {
        name: data.name,
        email: data.email,
        domain: data.domain || null,
        subscription_status: data.subscription_status,
        enabled_features: data.enabled_features as PermissionKey[],
      }
      const result = isEditing
        ? await updateTenant(tenantId!, payload)
        : await createTenant(payload)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      router.push(routes.admin.tenants)
    },
  })

  // --- Loading / Error states for edit mode ---

  if (isEditing && isLoading) return <TenantFormSkeleton />

  if (isEditing && fetchError) {
    return (
      <ErrorState
        title={messages.tenants.loadFailed}
        message={fetchError instanceof Error ? fetchError.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Back navigation + title */}
      <div>
        <Link
          href={routes.admin.tenants}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {messages.tenants.title}
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">
          {isEditing ? messages.tenants.editButton : messages.tenants.createButton}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6 max-w-2xl"
      >
        {/* Basic info card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              {messages.tenants.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name">
                {messages.tenants.name} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant-name"
                {...register('name')}
                placeholder={messages.tenants.namePlaceholder}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'tenant-name-error' : undefined}
              />
              {errors.name && (
                <p id="tenant-name-error" role="alert" className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-email">
                {messages.tenants.email} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant-email"
                type="email"
                {...register('email')}
                placeholder={messages.tenants.emailPlaceholder}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'tenant-email-error' : undefined}
              />
              {errors.email && (
                <p id="tenant-email-error" role="alert" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-domain">{messages.tenants.domain}</Label>
              <Input
                id="tenant-domain"
                {...register('domain')}
                placeholder={messages.tenants.domainPlaceholder}
              />
            </div>

            {/* Subscription status */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-status">{messages.tenants.status}</Label>
              <Controller
                name="subscription_status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tenant-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {messages.tenants.statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature flags card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              {messages.tenants.features}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {messages.tenants.featuresDescription}
            </p>
          </CardHeader>
          <CardContent>
            <Controller
              name="enabled_features"
              control={control}
              render={({ field }) => (
                <FeatureFlagSelector
                  value={field.value as PermissionKey[]}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.enabled_features && (
              <p role="alert" className="text-xs text-destructive mt-2">
                {errors.enabled_features.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mutation error */}
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!isValid || mutation.isPending}>
            {mutation.isPending ? messages.common.saving : messages.common.save}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={routes.admin.tenants}>{messages.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TenantFormSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48 mt-2" />
      </div>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-border p-6 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
