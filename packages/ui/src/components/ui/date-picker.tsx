'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerProps {
  /** Currently selected date */
  value?: Date
  /** Callback when date changes */
  onChange: (date: Date | undefined) => void
  /** Placeholder text when no date selected */
  placeholder?: string
  /** Disable dates before this date */
  minDate?: Date
  /** Disable dates after this date */
  maxDate?: Date
  /** Custom disabled date function */
  disabled?: (date: Date) => boolean
  /** HTML id for the trigger button */
  id?: string
  /** Additional class names for the trigger */
  className?: string
  /** Error state — shows destructive border */
  error?: boolean
  /** ARIA describedby */
  'aria-describedby'?: string
  /** ARIA required */
  'aria-required'?: boolean | 'true' | 'false'
  /** react-day-picker modifiers (e.g., for dot indicators) */
  modifiers?: Record<string, Date[]>
  /** react-day-picker modifiersClassNames */
  modifiersClassNames?: Record<string, string>
}

function DatePicker({
  value,
  onChange,
  placeholder = 'Wybierz datę',
  minDate,
  maxDate,
  disabled,
  id,
  className,
  error,
  modifiers,
  modifiersClassNames,
  ...ariaProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const disabledMatcher = React.useMemo(() => {
    if (disabled) return disabled
    if (minDate || maxDate) {
      return (date: Date) => {
        if (minDate && date < minDate) return true
        if (maxDate && date > maxDate) return true
        return false
      }
    }
    return undefined
  }, [disabled, minDate, maxDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            error && 'border-destructive',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          {...ariaProps}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'd MMMM yyyy', { locale: pl }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 7, 0)}
          endMonth={new Date(new Date().getFullYear() + 7, 11)}
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          disabled={disabledMatcher}
          locale={pl}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
        />
      </PopoverContent>
    </Popover>
  )
}

DatePicker.displayName = 'DatePicker'

export { DatePicker }
export type { DatePickerProps }
