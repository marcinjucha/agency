'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, Badge, Button, Progress, LoadingState } from '@agency/ui'
import { Store, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { messages, templates } from '@/lib/messages'
import { differenceInMinutes } from 'date-fns'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { startMarketplaceImport } from '../actions'
import { getImportPreviewListings } from '../actions.import'
import { getImportProgress } from '../queries'
import { MARKETPLACE_LABELS } from '../types'
import { ImportPreviewTable } from './ImportPreviewTable'
import type { MarketplaceConnection } from '../types'
import type { ImportPreviewListing } from '../actions.import'

// --- Step indicator ---

type StepStatus = 'active' | 'completed' | 'future'

type StepIndicatorProps = {
  steps: Array<{ label: string }>
  currentStep: number
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Kroki importu" aria-live="polite">
      <ol className="flex items-center gap-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          let status: StepStatus = 'future'
          if (stepNumber < currentStep) status = 'completed'
          else if (stepNumber === currentStep) status = 'active'

          const isLast = index === steps.length - 1

          return (
            <li key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                {/* Circle */}
                <div
                  aria-current={status === 'active' ? 'step' : undefined}
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : status === 'active'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </div>
                {/* Label */}
                <span
                  className={[
                    'text-xs whitespace-nowrap',
                    status === 'active'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={[
                    'self-start mt-4 h-px w-16 transition-colors sm:w-24',
                    index + 1 < currentStep ? 'bg-emerald-500' : 'bg-border',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// --- Step 1: Marketplace selection ---

type Step1Props = {
  connections: MarketplaceConnection[]
  selectedConnectionId: string | null
  onSelect: (id: string) => void
  onNext: () => void
}

function Step1MarketplaceSelect({ connections, selectedConnectionId, onSelect, onNext }: Step1Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground outline-none">
          {messages.marketplace.importStep1Title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.marketplace.importStep1Subtitle}
        </p>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-md border border-border bg-muted/30 px-6 py-8 text-center">
          <Store className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            {messages.marketplace.importNoConnections}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {messages.marketplace.importNoConnectionsDescription}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {connections.map((connection) => {
            const isSelected = selectedConnectionId === connection.id
            const label = MARKETPLACE_LABELS[connection.marketplace]
            const isActive = connection.is_active

            return (
              <button
                key={connection.id}
                onClick={() => isActive && onSelect(connection.id)}
                disabled={!isActive}
                aria-pressed={isSelected}
                aria-disabled={!isActive}
                className={[
                  'group relative flex items-center gap-4 rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isActive
                      ? 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
                      : 'cursor-not-allowed border-border bg-muted/20 opacity-50',
                ].join(' ')}
              >
                {/* Icon */}
                <div
                  className={[
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary/10' : 'bg-muted',
                  ].join(' ')}
                >
                  <Store
                    className={[
                      'h-6 w-6',
                      isSelected ? 'text-primary' : 'text-muted-foreground',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">{label}</p>
                  {connection.account_name && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {connection.account_name}
                    </p>
                  )}
                  {!isActive && (
                    <p className="mt-0.5 text-xs text-destructive">
                      {messages.marketplace.importNotConnectedNote}
                    </p>
                  )}
                </div>

                {/* Active badge */}
                {isActive && (
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    {messages.marketplace.active}
                  </Badge>
                )}

                {/* Selected indicator */}
                {isSelected && (
                  <div
                    className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!selectedConnectionId}
          aria-disabled={!selectedConnectionId}
        >
          {messages.marketplace.importNext}
          <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

// --- Step 2: Listing preview + selection ---

type Step2Props = {
  connectionId: string
  onBack: () => void
  onImport: (selectedIds: string[]) => void
  isImporting: boolean
}

function Step2ListingPreview({ connectionId, onBack, onImport, isImporting }: Step2Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [listingsData, setListingsData] = useState<{
    listings: ImportPreviewListing[]
    capped: boolean
  } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // Fetch listings on mount — Server Action called directly (not TanStack Query)
  // WHY: getImportPreviewListings is a Server Action (not a browser query function).
  // This is one-shot fetch on step entry, not a cached background query.
  const fetchListings = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await getImportPreviewListings(connectionId)
      if (!result.success || !result.data) {
        setLoadError(result.error ?? messages.common.unknownError)
        return
      }
      setListingsData({ listings: result.data.listings, capped: result.data.capped })
      // Auto-select all non-duplicate listings
      const newIds = new Set(
        result.data.listings
          .filter((l) => !l.already_imported)
          .map((l) => l.externalListingId)
      )
      setSelectedIds(newIds)
    } catch {
      setLoadError(messages.common.unknownError)
    } finally {
      setIsLoading(false)
    }
  }, [connectionId])

  // Run once on mount
  useEffect(() => {
    void fetchListings()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once on mount
  }, [])

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    if (!listingsData) return
    const allIds = listingsData.listings.map((l) => l.externalListingId)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }, [listingsData, selectedIds])

  const handleImport = () => {
    if (selectedIds.size === 0) return
    onImport(Array.from(selectedIds))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground outline-none">
          {messages.marketplace.importStep2Title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.marketplace.importStep2Subtitle}
        </p>
      </div>

      <ImportPreviewTable
        listings={listingsData?.listings ?? []}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onToggleAll={handleToggleAll}
        isLoading={isLoading}
        error={loadError}
        capped={listingsData?.capped}
      />

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          <ChevronLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {messages.marketplace.importBack}
        </Button>
        <Button
          onClick={handleImport}
          disabled={selectedIds.size === 0 || isImporting}
          aria-disabled={selectedIds.size === 0 || isImporting}
        >
          {isImporting ? messages.marketplace.importStarting : messages.marketplace.importStart}
          {!isImporting && <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}

// --- Step 3: Progress polling ---

type Step3Props = {
  importId: string
}

function Step3Progress({ importId }: Step3Props) {
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const { data: importRecord } = useQuery({
    queryKey: queryKeys.marketplace.importProgress(importId),
    queryFn: () => getImportProgress(importId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 3000
    },
  })

  const status = importRecord?.status ?? 'pending'
  const totalItems = importRecord?.total_items ?? 0
  const importedItems = importRecord?.imported_items ?? 0
  const skippedItems = importRecord?.skipped_items ?? 0
  const errorLog = importRecord?.error_log ?? []

  const progressPercent =
    totalItems > 0 ? Math.round((importedItems / totalItems) * 100) : 0

  const isDone = status === 'completed' || status === 'failed'

  let statusText: string
  if (status === 'pending') {
    statusText = messages.marketplace.importProgressPending
  } else if (status === 'running') {
    statusText = messages.marketplace.importProgressRunning(importedItems, totalItems)
  } else if (status === 'completed') {
    statusText = messages.marketplace.importProgressCompleted(importedItems, skippedItems)
  } else {
    statusText = messages.marketplace.importProgressFailed
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground outline-none">
          {messages.marketplace.importStep3Title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.marketplace.importStep3Subtitle}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p
                className={[
                  'text-sm font-medium',
                  status === 'failed' ? 'text-destructive' : 'text-foreground',
                ].join(' ')}
              >
                {statusText}
              </p>
              {(status === 'running' || status === 'completed') && (
                <p className="text-sm text-muted-foreground">{progressPercent}%</p>
              )}
            </div>
            <Progress
              value={status === 'completed' ? 100 : progressPercent}
              className={[
                'h-2',
                status === 'failed' ? '[&>div]:bg-destructive' : '',
              ].join(' ')}
              aria-label={`Postęp importu: ${progressPercent}%`}
            />
          </div>

          {/* Stats row — visible once we have data */}
          {(status === 'running' || status === 'completed') && totalItems > 0 && (
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/30 px-4 py-3">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{totalItems}</p>
                <p className="text-xs text-muted-foreground">{messages.marketplace.importTotal}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-emerald-400">{importedItems}</p>
                <p className="text-xs text-muted-foreground">{messages.marketplace.importImported}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-amber-400">{skippedItems}</p>
                <p className="text-xs text-muted-foreground">{messages.marketplace.importSkipped}</p>
              </div>
            </div>
          )}

          {/* Error details */}
          {status === 'failed' && errorLog.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <ul className="space-y-1 text-xs text-destructive">
                {errorLog.slice(0, 5).map((entry, i) => (
                  <li key={i}>
                    {entry.listingId && (
                      <span className="font-mono opacity-80">#{entry.listingId}: </span>
                    )}
                    {entry.message}
                  </li>
                ))}
                {errorLog.length > 5 && (
                  <li className="opacity-70">{templates.marketplace.importMoreErrors(errorLog.length - 5)}</li>
                )}
              </ul>
            </div>
          )}

          {/* Pending spinner */}
          {(status === 'pending' || status === 'running') && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              {messages.marketplace.importSyncing}
            </div>
          )}

          {/* Stuck import warning — shown after 10 minutes without completion */}
          {(status === 'pending' || status === 'running') &&
            importRecord?.created_at &&
            differenceInMinutes(new Date(), new Date(importRecord.created_at)) >= 10 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <p className="text-xs text-amber-400">{messages.marketplace.importStuckWarning}</p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Done action */}
      {isDone && (
        <div className="flex justify-end">
          <Button
            onClick={() => router.push(routes.admin.shopMarketplace)}
            variant={status === 'failed' ? 'outline' : 'default'}
          >
            {messages.marketplace.importFinished}
          </Button>
        </div>
      )}
    </div>
  )
}

// --- Main wizard ---

type WizardStep = 1 | 2 | 3

type MarketplaceImportWizardProps = {
  connections: MarketplaceConnection[]
}

const STEPS = [
  { label: messages.marketplace.importStepMarketplace },
  { label: messages.marketplace.importStepListings },
  { label: messages.marketplace.importStepImport },
]

export function MarketplaceImportWizard({ connections }: MarketplaceImportWizardProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<WizardStep>(1)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [importId, setImportId] = useState<string | null>(null)

  const startImport = useMutation({
    mutationFn: async ({ connectionId, listingIds }: { connectionId: string; listingIds: string[] }) => {
      const result = await startMarketplaceImport(
        { connectionId },
        listingIds
      )
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (result) => {
      setImportId(result.data.importId)
      setStep(3)
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all })
    },
  })

  const handleImport = (selectedIds: string[]) => {
    if (!selectedConnectionId) return
    startImport.mutate({ connectionId: selectedConnectionId, listingIds: selectedIds })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step indicator */}
      <div className="flex justify-center">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Step panels */}
      {step === 1 && (
        <Step1MarketplaceSelect
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          onSelect={setSelectedConnectionId}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && selectedConnectionId && (
        <Step2ListingPreview
          connectionId={selectedConnectionId}
          onBack={() => setStep(1)}
          onImport={handleImport}
          isImporting={startImport.isPending}
        />
      )}

      {step === 3 && importId && (
        <Step3Progress importId={importId} />
      )}

      {/* Global mutation error (shown in Step 2 context) */}
      {step === 2 && startImport.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-xs text-destructive">
            {startImport.error instanceof Error
              ? startImport.error.message
              : messages.marketplace.importFailed}
          </p>
        </div>
      )}
    </div>
  )
}
