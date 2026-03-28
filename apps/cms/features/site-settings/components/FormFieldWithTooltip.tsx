'use client'

import { HelpCircle } from 'lucide-react'
import {
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@agency/ui'

interface FormFieldWithTooltipProps {
  htmlFor: string
  label: string
  tooltip: string
  children: React.ReactNode
  error?: string
  helperText?: string
}

export function FormFieldWithTooltip({
  htmlFor,
  label,
  tooltip,
  children,
  error,
  helperText,
}: FormFieldWithTooltipProps) {
  const errorId = `${htmlFor}-error`
  const helperId = `${htmlFor}-helper`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={tooltip}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {children}

      {helperText && !error && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
