import { Button, ErrorState } from '@agency/ui'
import { Loader2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { CalendarSlot } from '../types'

interface BookingFormProps {
  isSubmitting: boolean
  submitError: string | null
  selectedDate: Date | null
  selectedSlot: CalendarSlot
}

/**
 * Booking confirmation surface — appointment summary + submit button.
 *
 * AAA-T-63 (Commit 9): Collapsed from a 3-field form (name/email/notes) to
 * a confirmation-only view. Client name + email are derived server-side from
 * the survey response (`responses.respondent_name`, `responses.client_email`)
 * — re-typing data the client just submitted in the survey was a UX duplication
 * and a data-inconsistency risk. Notes were dropped entirely.
 */
export function BookingForm({
  isSubmitting,
  submitError,
  selectedDate,
  selectedSlot,
}: BookingFormProps) {
  return (
    <>
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary">
          <strong>{messages.calendar.selectedAppointment}</strong>{' '}
          {selectedDate?.toLocaleDateString('pl-PL')} {messages.calendar.at}{' '}
          {new Date(selectedSlot.start).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {submitError && (
        <ErrorState
          message={submitError}
          variant="inline"
          title={messages.calendar.bookingError}
        />
      )}

      <div className="pt-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-lg font-semibold"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {messages.calendar.confirming}
            </span>
          ) : (
            messages.calendar.confirmAppointment
          )}
        </Button>
      </div>
    </>
  )
}
