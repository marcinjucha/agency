'use client'

import { Skeleton, cn } from '@agency/ui'
import { Loader2 } from 'lucide-react'

type LoadingStateProps = {
  variant?: 'spinner' | 'skeleton-table' | 'skeleton-list' | 'skeleton-card'
  rows?: number
  message?: string
  className?: string
}

/**
 * LoadingState Component
 *
 * Shared loading state component for website app.
 * Follows same pattern as CMS app for consistency.
 *
 * @param variant - Loading style (spinner, skeleton-table, skeleton-list, skeleton-card)
 * @param rows - Number of skeleton rows (default: 5)
 * @param message - Optional message to display below spinner
 * @param className - Additional CSS classes
 */
export function LoadingState({
  variant = 'spinner',
  rows = 5,
  message,
  className
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Loader2 className="h-12 w-12 animate-spin text-primary" aria-label="Loading" />
        {message && (
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    )
  }

  if (variant === 'skeleton-table') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'skeleton-list') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    )
  }

  if (variant === 'skeleton-card') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-muted p-6 space-y-4"
          >
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  return null
}
