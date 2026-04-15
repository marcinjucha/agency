import { Calendar, CheckCircle, Clock } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { CalendarSlot } from '../types'

interface BookingSuccessProps {
  date: Date | null
  slot: CalendarSlot | null
}

export function BookingSuccess({ date, slot }: BookingSuccessProps) {
  if (!date || !slot) return null

  const slotTime = new Date(slot.start)
  const formattedDate = date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = slotTime.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-6">
        <CheckCircle className="h-16 w-16 text-primary" />
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-3">
        {messages.calendar.appointmentConfirmed}
      </h2>
      <p className="text-muted-foreground mb-8">
        {messages.calendar.appointmentBookedSuccess}
      </p>

      <div className="bg-muted rounded-lg p-6 mb-8 max-w-sm mx-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-left">
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">{messages.calendar.dateLabel}</p>
              <p className="font-semibold text-foreground">{formattedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left">
            <Clock className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">{messages.calendar.timeLabel}</p>
              <p className="font-semibold text-foreground">{formattedTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
