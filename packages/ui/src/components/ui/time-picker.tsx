'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

interface TimePickerProps {
  /** Currently selected time in "HH:mm" format (24h) */
  value?: string
  /** Callback when time changes */
  onChange: (time: string | undefined) => void
  /** Placeholder text when no time selected */
  placeholder?: string
  /** HTML id for the trigger button */
  id?: string
  /** Additional class names for the trigger */
  className?: string
  /** Error state — shows destructive border */
  error?: boolean
  /** Disable the picker */
  disabled?: boolean
  /** Minute interval for options */
  minuteStep?: 1 | 5 | 10 | 15
  /** ARIA describedby */
  'aria-describedby'?: string
  /** ARIA required */
  'aria-required'?: boolean | 'true' | 'false'
}

const pad = (n: number): string => n.toString().padStart(2, '0')

function TimePicker({
  value,
  onChange,
  placeholder = 'Wybierz godzinę',
  id,
  className,
  error,
  disabled,
  minuteStep = 5,
  ...ariaProps
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const hours = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => pad(i)),
    []
  )

  const minutes = React.useMemo(
    () => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => pad(i * minuteStep)),
    [minuteStep]
  )

  const selectedHour = value ? value.split(':')[0] : undefined
  const selectedMinute = value ? value.split(':')[1] : undefined

  const handleHourChange = (hour: string) => {
    const minute = selectedMinute ?? '00'
    const newValue = `${hour}:${minute}`
    onChange(newValue)
    if (selectedMinute) {
      setOpen(false)
    }
  }

  const handleMinuteChange = (minute: string) => {
    const hour = selectedHour ?? pad(new Date().getHours())
    const newValue = `${hour}:${minute}`
    onChange(newValue)
    if (selectedHour) {
      setOpen(false)
    }
  }

  const handleClear = () => {
    onChange(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            error && 'border-destructive',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          {...ariaProps}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4" align="start">
        <div className="flex items-center gap-2">
          <Select value={selectedHour} onValueChange={handleHourChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">:</span>
          <Select value={selectedMinute} onValueChange={handleMinuteChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="mm" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={handleClear}
          >
            Wyczyść
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

TimePicker.displayName = 'TimePicker'

export { TimePicker }
export type { TimePickerProps }
