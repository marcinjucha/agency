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
  /** Override classes on the outer Card. */
  className?: string
  /**
   * Override classes on the CardHeader (clickable trigger row).
   * Use to compress default `py-3` for dense panels.
   */
  headerClassName?: string
  /**
   * Override classes on the CardContent (collapsible body).
   * Use to compress default `pt-0 pb-4` for dense panels.
   */
  contentClassName?: string
  icon?: React.ReactNode
  /**
   * Title style variant.
   * - 'default' = `text-sm font-medium` (standard card title)
   * - 'eyebrow' = `text-xs font-medium uppercase tracking-wider text-muted-foreground`
   *   (compact section header for dense inspector panels)
   */
  titleVariant?: 'default' | 'eyebrow'
  /**
   * Optional controlled state. When provided together with `onOpenChange`,
   * the component behaves as fully controlled and `defaultOpen` is ignored.
   * Use this when the caller persists open state (localStorage, URL, etc.).
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
  className,
  headerClassName,
  contentClassName,
  icon,
  titleVariant = 'default',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CollapsibleCardProps) {
  // Dev-mode warning when only one of {open, onOpenChange} is provided —
  // partial controlled mode is almost always a bug (the component silently
  // falls back to uncontrolled, ignoring the prop the caller did pass).
  if (process.env.NODE_ENV === 'development') {
    const openProvided = controlledOpen !== undefined
    const handlerProvided = controlledOnOpenChange !== undefined
    if (openProvided !== handlerProvided) {
      // eslint-disable-next-line no-console
      console.warn(
        'CollapsibleCard: `open` and `onOpenChange` must be provided together for controlled mode',
      )
    }
  }

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen

  const titleClassName =
    titleVariant === 'eyebrow'
      ? 'text-xs font-medium uppercase tracking-wider text-muted-foreground'
      : 'text-sm font-medium'

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn('overflow-hidden', className)}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={cn(
              // `rounded-[inherit]` makes the focus ring match whatever rounding
              // the outer Card applies. Default Card has `rounded-xl` → ring is
              // rounded; Inspector overrides to `rounded-none` → ring is square,
              // matching the card border. Avoids the visual mismatch where a
              // hardcoded `rounded-t-xl` focus ring sits on a square card.
              'cursor-pointer select-none py-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-[inherit]',
              headerClassName,
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className={titleClassName}>{title}</CardTitle>
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
          <CardContent className={cn('pt-0 pb-4', contentClassName)}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export { CollapsibleCard }
export type { CollapsibleCardProps }
