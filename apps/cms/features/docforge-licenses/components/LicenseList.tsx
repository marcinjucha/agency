'use client'

import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, EmptyState, ErrorState, Skeleton } from '@agency/ui'
import { KeyRound, Plus } from 'lucide-react'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'
import { useLicenses } from '../queries'
import { toggleLicenseActive } from '../actions'
import { computeLicenseStatus } from '../utils'
import type { License } from '../types'
import { StatsBar } from './StatsBar'
import { StatusFilter, type StatusFilterValue } from './StatusFilter'
import { LicenseCard } from './LicenseCard'
import { LicenseTable } from './LicenseTable'
import { CreateLicenseDialog } from './CreateLicenseDialog'
import { LicenseDetailPanel } from './LicenseDetailPanel'

/** Breakpoint value matching Tailwind xl (1280px) */
const XL_BREAKPOINT = 1280

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function matchesSearch(license: License, query: string): boolean {
  const q = query.toLowerCase()
  return (
    license.key.toLowerCase().includes(q) ||
    (license.client_name?.toLowerCase().includes(q) ?? false) ||
    (license.email?.toLowerCase().includes(q) ?? false)
  )
}

function filterLicenses(licenses: License[], status: StatusFilterValue, search: string): License[] {
  return licenses.filter((license) => {
    if (status !== 'all' && computeLicenseStatus(license) !== status) return false
    if (search && !matchesSearch(license, search)) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function LicenseListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-44" />
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LicenseList() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useViewMode('docforge-licenses-view-mode', 'grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all')
  const [search, setSearch] = useState('')
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null)

  const { data: licenses, isLoading, error, refetch } = useLicenses()

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const result = await toggleLicenseActive(id, isActive)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.docforgeLicenses.all })
    },
  })

  const handleToggle = useCallback(
    (id: string, isActive: boolean) => {
      toggleMutation.mutate({ id, isActive })
    },
    [toggleMutation],
  )

  const handleSelect = useCallback((id: string) => {
    setSelectedLicenseId(id)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedLicenseId(null)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const filteredLicenses = useMemo(
    () => filterLicenses(licenses ?? [], statusFilter, search),
    [licenses, statusFilter, search],
  )

  // --- Loading ---
  if (isLoading) return <LicenseListSkeleton />

  // --- Error ---
  if (error) {
    return (
      <ErrorState
        title={messages.docforgeLicenses.loadError}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  const allLicenses = licenses ?? []

  // --- Empty ---
  if (allLicenses.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EmptyState
          icon={KeyRound}
          title={messages.docforgeLicenses.emptyList}
          description={messages.docforgeLicenses.emptyDescription}
          variant="card"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.docforgeLicenses.createButton}
            </Button>
          }
        />
        <CreateLicenseDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    )
  }

  // --- Determine if panel is open on xl+ ---
  const isPanelOpen = selectedLicenseId !== null

  // --- Grid columns adjust when panel is open ---
  const gridCols = isPanelOpen
    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

  // --- Success ---
  return (
    <div className="flex gap-0">
      {/* Left side: list content — shrinks when panel is open */}
      <div
        className={`min-w-0 transition-all duration-200 ${
          isPanelOpen ? 'hidden xl:block xl:flex-1' : 'flex-1'
        }`}
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PageHeader />
            <div className="flex items-center gap-3">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {messages.docforgeLicenses.createButton}
              </Button>
            </div>
          </div>

          <StatsBar licenses={allLicenses} />

          <StatusFilter
            status={statusFilter}
            onStatusChange={setStatusFilter}
            search={search}
            onSearchChange={handleSearchChange}
          />

          {viewMode === 'grid' ? (
            <div className={`grid ${gridCols} gap-4`}>
              {filteredLicenses.map((license) => (
                <LicenseCard
                  key={license.id}
                  license={license}
                  onSelect={handleSelect}
                  onToggle={handleToggle}
                  isToggling={toggleMutation.isPending && toggleMutation.variables?.id === license.id}
                  isSelected={license.id === selectedLicenseId}
                />
              ))}
            </div>
          ) : (
            <LicenseTable
              licenses={filteredLicenses}
              onSelect={handleSelect}
              onToggle={handleToggle}
              togglingId={toggleMutation.isPending ? (toggleMutation.variables?.id ?? null) : null}
            />
          )}

          <CreateLicenseDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
      </div>

      {/* Right side: inline detail panel (xl+ = side panel, <xl = full width) */}
      {isPanelOpen && (
        <div className="w-full xl:w-[480px] xl:min-w-[480px] border-l border-border">
          <LicenseDetailPanel
            licenseId={selectedLicenseId!}
            onClose={handleClosePanel}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page header (extracted to avoid duplication in empty/success states)
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{messages.docforgeLicenses.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{messages.docforgeLicenses.subtitle}</p>
    </div>
  )
}
