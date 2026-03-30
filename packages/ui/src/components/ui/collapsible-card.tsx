'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { cn } from '../../lib/utils'

interface CollapsibleCardProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
  className,
  icon,
}: CollapsibleCardProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn('overflow-hidden', className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  open && 'rotate-180'
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export { CollapsibleCard }
export type { CollapsibleCardProps }
