'use client'

import type { CalendarSlot } from '../types'

interface TimeSlotsGridProps {
  slots: CalendarSlot[]
  selectedSlot: CalendarSlot | null
  onSelectSlot: (slot: CalendarSlot) => void
}

export function TimeSlotsGrid({ slots, selectedSlot, onSelectSlot }: TimeSlotsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot) => {
        const slotTime = new Date(slot.start)
        const timeString = slotTime.toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const isSelected =
          selectedSlot?.start === slot.start && selectedSlot?.end === slot.end

        return (
          <button
            key={`${slot.start}-${slot.end}`}
            onClick={() => onSelectSlot(slot)}
            className={`p-3 rounded-lg border-2 transition-all font-medium text-sm min-h-[48px] ${
              isSelected
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-card text-foreground border-border hover:border-primary hover:bg-primary/5'
            }`}
            type="button"
          >
            {timeString}
          </button>
        )
      })}
    </div>
  )
}
