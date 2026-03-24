'use client'

import { Card } from './components/ui/card'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import { AlertCircle } from 'lucide-react'

type ErrorStateProps = {
  title?: string
  message: string
  onRetry?: () => void
  variant?: 'card' | 'inline'
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  variant = 'card',
  className
}: ErrorStateProps) {
  const content = (
    <div className="flex flex-col items-center text-center space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )

  if (variant === 'card') {
    return (
      <Card
        className={cn(
          'p-12 border-destructive/50 bg-destructive/5',
          className
        )}
        role="alert"
        aria-live="polite"
      >
        {content}
      </Card>
    )
  }

  return (
    <div
      className={cn(
        'py-12 px-4 rounded-xl border border-destructive/50 bg-destructive/10',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {content}
    </div>
  )
}
