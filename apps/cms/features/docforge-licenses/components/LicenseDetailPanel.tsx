'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Switch,
  Skeleton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@agency/ui'
import { ArrowLeft, Check, Clipboard, Pencil, Trash2, X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { useLicense, useLicenseActivations } from '../queries'
import { updateLicense, deleteLicense, deactivateActivation, toggleLicenseActive } from '../actions'
import { computeLicenseStatus, formatExpiry } from '../utils'
import { StatusBadge } from './LicenseCard'
import { SeatsProgressBar } from './SeatsProgressBar'
import { ActivationCard, ActivationsEmptyState } from './ActivationCard'

// ---------------------------------------------------------------------------
// Inline edit hook
// ---------------------------------------------------------------------------

function useInlineEdit<T>(
  initialValue: T,
  onSave: (value: T) => void,
) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<T>(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft when initialValue changes externally
  useEffect(() => {
    if (!isEditing) setDraft(initialValue)
  }, [initialValue, isEditing])

  const startEditing = useCallback(() => {
    setDraft(initialValue)
    setIsEditing(true)
    // Focus on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [initialValue])

  const cancel = useCallback(() => {
    setDraft(initialValue)
    setIsEditing(false)
  }, [initialValue])

  const save = useCallback(() => {
    onSave(draft)
    setIsEditing(false)
  }, [draft, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') save()
      if (e.key === 'Escape') cancel()
    },
    [save, cancel],
  )

  return { isEditing, draft, setDraft, inputRef, startEditing, cancel, save, handleKeyDown }
}

// ---------------------------------------------------------------------------
// Inline editable field
// ---------------------------------------------------------------------------

interface InlineFieldProps {
  label: string
  value: string
  type?: 'text' | 'number' | 'date' | 'email'
  onSave: (value: string) => void
  readOnly?: boolean
}

function InlineField({ label, value, type = 'text', onSave, readOnly }: InlineFieldProps) {
  const edit = useInlineEdit(value, onSave)

  return (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {edit.isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              ref={edit.inputRef}
              type={type}
              value={edit.draft}
              onChange={(e) => edit.setDraft(e.target.value)}
              onKeyDown={edit.handleKeyDown}
              onBlur={edit.save}
              className="h-8 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={edit.cancel} aria-label={messages.common.cancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0 group">
            <span className="text-sm text-foreground truncate">{value || '—'}</span>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                onClick={edit.startEditing}
                aria-label={`${messages.common.edit} ${label}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyKeyButton({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(licenseKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [licenseKey])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
      aria-label={copied ? messages.docforgeLicenses.keyCopied : messages.docforgeLicenses.copyKey}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Clipboard className="h-4 w-4" />
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

// ---------------------------------------------------------------------------
// Detail panel skeleton
// ---------------------------------------------------------------------------

function DetailPanelSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LicenseDetailPanelProps {
  licenseId: string
  onClose: () => void
}

export function LicenseDetailPanel({ licenseId, onClose }: LicenseDetailPanelProps) {
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: license, isLoading: licenseLoading } = useLicense(licenseId)
  const { data: activations, isLoading: activationsLoading } = useLicenseActivations(licenseId)

  const activeActivations = activations?.filter((a) => a.is_active) ?? []
  const activeSeats = activeActivations.length

  // --- Mutations ---

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const result = await updateLicense(licenseId, data)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const result = await toggleLicenseActive(licenseId, isActive)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await deleteLicense(licenseId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
      setDeleteOpen(false)
      onClose()
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (activationId: string) => {
      const result = await deactivateActivation(activationId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.activations(licenseId) })
    },
  })

  // --- Field save handlers ---

  const saveField = useCallback(
    (field: string) => (value: string) => {
      const payload: Record<string, unknown> = {}

      if (field === 'max_seats' || field === 'grace_days') {
        const num = parseInt(value, 10)
        if (isNaN(num)) return
        payload[field] = num
      } else if (field === 'expires_at') {
        payload[field] = value || null
      } else {
        payload[field] = value || null
      }

      updateMutation.mutate(payload)
    },
    [updateMutation],
  )

  // --- Loading state ---

  if (licenseLoading) return <DetailPanelSkeleton />

  if (!license) return null

  const status = computeLicenseStatus(license)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label={messages.common.back}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-medium text-foreground truncate">
                {license.key}
              </span>
              <CopyKeyButton licenseKey={license.key} />
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Seats progress */}
        <SeatsProgressBar active={activeSeats} max={license.max_seats} />

        {/* Info section */}
        <section>
          <SectionHeading>{messages.docforgeLicenses.sectionInfo}</SectionHeading>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
            <InlineField
              label={messages.docforgeLicenses.clientNameLabel}
              value={license.client_name ?? ''}
              onSave={saveField('client_name')}
            />
            <InlineField
              label={messages.docforgeLicenses.emailLabel}
              value={license.email ?? ''}
              type="email"
              onSave={saveField('email')}
            />
            <InlineField
              label={messages.docforgeLicenses.expiresAtLabel}
              value={license.expires_at?.split('T')[0] ?? ''}
              type="date"
              onSave={saveField('expires_at')}
            />
            <InlineField
              label={messages.docforgeLicenses.maxSeatsLabel}
              value={String(license.max_seats)}
              type="number"
              onSave={saveField('max_seats')}
            />
            <InlineField
              label={messages.docforgeLicenses.graceDaysLabel}
              value={String(license.grace_days)}
              type="number"
              onSave={saveField('grace_days')}
            />

            {/* Active toggle */}
            <span className="text-sm text-muted-foreground">{messages.docforgeLicenses.isActiveLabel}</span>
            <div>
              <Switch
                checked={license.is_active}
                onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                disabled={toggleMutation.isPending}
                aria-label={messages.docforgeLicenses.isActiveLabel}
              />
            </div>

            {/* Created at (read-only) */}
            <InlineField
              label={messages.docforgeLicenses.createdAt}
              value={new Date(license.created_at).toLocaleDateString('pl-PL')}
              onSave={() => {}}
              readOnly
            />
          </div>
        </section>

        {/* Activations section */}
        <section>
          <SectionHeading>{messages.docforgeLicenses.sectionActivations}</SectionHeading>
          <div className="mt-3 space-y-3">
            {activationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : activeActivations.length === 0 ? (
              <ActivationsEmptyState />
            ) : (
              activeActivations.map((activation) => (
                <ActivationCard
                  key={activation.id}
                  activation={activation}
                  onDeactivate={(id) => deactivateMutation.mutate(id)}
                  isDeactivating={
                    deactivateMutation.isPending &&
                    deactivateMutation.variables === activation.id
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Footer: Delete button */}
      <div className="border-t border-border p-4">
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {messages.common.delete}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{messages.docforgeLicenses.deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {messages.docforgeLicenses.deleteConfirmDescription(license.key)}
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
  )
}
