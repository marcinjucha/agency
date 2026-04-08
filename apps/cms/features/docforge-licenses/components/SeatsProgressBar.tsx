'use client'

import { messages } from '@/lib/messages'
import { seatsUsagePercent, seatsBarColor } from '../utils'

interface SeatsProgressBarProps {
  active: number
  max: number
}

export function SeatsProgressBar({ active, max }: SeatsProgressBarProps) {
  const percent = seatsUsagePercent(active, max)
  const clampedPercent = Math.min(percent, 100)
  const isFull = percent >= 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {messages.docforgeLicenses.seatsOccupied(active, max)}
        </span>
      </div>
      <div
        className="h-2.5 rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={messages.docforgeLicenses.seatsOccupied(active, max)}
      >
        <div
          className={`h-2.5 rounded-full transition-all ${seatsBarColor(percent)}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {isFull && (
        <p className="text-xs text-amber-400">{messages.docforgeLicenses.seatsFull}</p>
      )}
    </div>
  )
}
