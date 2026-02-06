'use client'

import { Card, cn } from '@agency/ui'
import { type LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  variant?: 'card' | 'inline'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'inline',
  className
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center text-center space-y-4">
      <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )

  if (variant === 'card') {
    return (
      <Card className={cn('p-12', className)}>
        {content}
      </Card>
    )
  }

  return (
    <div className={cn('py-12 px-4', className)}>
      {content}
    </div>
  )
}
