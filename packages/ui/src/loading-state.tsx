'use client'

import { Skeleton } from './components/ui/skeleton'
import { cn } from './lib/utils'
import { Loader2 } from 'lucide-react'

type LoadingStateProps = {
  variant?: 'spinner' | 'skeleton-table' | 'skeleton-list' | 'skeleton-card' | 'skeleton-grid'
  rows?: number
  /** Grid columns for skeleton-grid variant (default: responsive 1→2→3→4) */
  cols?: number
  message?: string
  className?: string
}

export function LoadingState({
  variant = 'spinner',
  rows = 5,
  cols,
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

  if (variant === 'skeleton-grid') {
    const gridCols = cols
      ? `grid-cols-${cols}`
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
    return (
      <div className={cn(`grid ${gridCols} gap-4`, className)}>
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
