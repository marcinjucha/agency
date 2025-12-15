/**
 * CalendarBooking Component
 *
 * Multi-step appointment booking interface for survey respondents.
 * Allows clients to select a date, choose available time slots, and fill booking details.
 *
 * ARCHITECTURE:
 * - Step 1: Date picker (user selects date)
 * - Step 2: Time slots grid (fetched from API when date selected)
 * - Step 3: Booking form with name/email/notes
 * - Step 4: Success confirmation
 *
 * STATE MANAGEMENT:
 * - selectedDate: manages date picker state
 * - selectedSlot: manages selected time slot
 * - isSubmitting: manages form submission state
 * - React Hook Form: manages booking form validation
 * - TanStack Query: NOT used here (website app, simple component)
 *
 * ERROR HANDLING:
 * - Calendar unavailable (no API connection)
 * - No available slots for selected date
 * - Form validation errors (name/email required)
 * - Booking submission failure
 *
 * ACCESSIBILITY:
 * - Proper labels with htmlFor
 * - ARIA attributes for errors and alerts
 * - Keyboard navigation support
 * - Error messages linked to fields
 *
 * @module apps/website/features/survey/components/CalendarBooking
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Card, Input, Label } from '@legal-mind/ui'
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * Slot object structure returned from /api/calendar/slots
 */
interface CalendarSlot {
  start: string // ISO 8601 datetime
  end: string // ISO 8601 datetime
}

/**
 * Booking form validation schema
 * Validates that name/email are provided and email is valid format
 */
const bookingFormSchema = z.object({
  clientName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  clientEmail: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .default(''),
})

type BookingFormData = z.infer<typeof bookingFormSchema>

/**
 * Success message component shown after booking confirmation
 */
function SuccessMessage({
  date,
  slot,
}: {
  date: Date | null
  slot: CalendarSlot | null
}) {
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
        <CheckCircle className="h-16 w-16 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">
        Appointment Confirmed!
      </h2>
      <p className="text-gray-600 mb-8">
        Your appointment has been successfully booked.
      </p>

      {/* Booking Details Summary */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-sm mx-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-left">
            <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold text-gray-900">{formattedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left">
            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-semibold text-gray-900">{formattedTime}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-600">
        A confirmation email has been sent to your inbox.
      </p>
    </div>
  )
}

/**
 * Error alert component
 */
function ErrorAlert({
  message,
  className = '',
}: {
  message: string
  className?: string
}) {
  return (
    <div
      className={`bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3 ${className}`}
      role="alert"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Error</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for time slots
 */
function LoadingSlots() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-gray-200 rounded-md animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Time slots grid component
 * Displays available appointment times for selected date
 */
function TimeSlotsGrid({
  slots,
  selectedSlot,
  onSelectSlot,
}: {
  slots: CalendarSlot[]
  selectedSlot: CalendarSlot | null
  onSelectSlot: (slot: CalendarSlot) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot, index) => {
        const slotTime = new Date(slot.start)
        const timeString = slotTime.toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const isSelected =
          selectedSlot?.start === slot.start && selectedSlot?.end === slot.end

        return (
          <button
            key={index}
            onClick={() => onSelectSlot(slot)}
            className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
              isSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-900 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
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

/**
 * Main CalendarBooking component
 *
 * @param surveyId - Survey UUID for tracking
 * @param responseId - Response UUID from survey submission
 * @param lawyerEmail - Optional: specific lawyer email for booking
 */
interface CalendarBookingProps {
  surveyId: string
  responseId: string
  lawyerEmail?: string
}

export function CalendarBooking({
  surveyId,
  responseId,
  lawyerEmail,
}: CalendarBookingProps) {
  // State: Multi-step form flow
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // State: API errors
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [slots, setSlots] = useState<CalendarSlot[]>([])

  // State: Form submission
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form validation with React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema as any),
    mode: 'onBlur',
  })

  /**
   * Handle date selection and fetch available slots
   */
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value
    if (!dateValue) {
      setSelectedDate(null)
      return
    }

    const date = new Date(dateValue)
    setSelectedDate(date)
    setSelectedSlot(null) // Reset selected slot when date changes
    setSlotsError(null)
    setSlotsLoading(true)

    try {
      const dateStr = dateValue // YYYY-MM-DD format from input
      const params = new URLSearchParams({
        surveyId,
        date: dateStr,
      })
      if (lawyerEmail) {
        params.append('lawyerEmail', lawyerEmail)
      }

      const response = await fetch(`/api/calendar/slots?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 404) {
          setSlotsError(
            'Calendar not connected for this lawyer. Please contact support.'
          )
        } else {
          setSlotsError('Failed to load available times. Please try again.')
        }
        setSlots([])
        return
      }

      const data = await response.json()

      if (!data.slots || data.slots.length === 0) {
        setSlotsError('No available times for this date. Please choose another.')
        setSlots([])
      } else {
        setSlotsError(null)
        setSlots(data.slots)
      }
    } catch (error) {
      console.error('Error fetching calendar slots:', error)
      setSlotsError('Unable to load times. Please check your connection.')
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  /**
   * Handle booking form submission
   */
  const onSubmit = async (data: BookingFormData) => {
    if (!selectedSlot) {
      setSubmitError('Please select a time slot')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId,
          responseId,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          notes: data.notes || null,
          lawyerEmail: lawyerEmail || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setBookingSuccess(true)
      } else {
        setSubmitError(
          result.error || 'Booking failed. Please try again.'
        )
      }
    } catch (error) {
      console.error('Booking submission error:', error)
      setSubmitError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate min date (today)
  const today = new Date()
  const minDate = today.toISOString().split('T')[0]

  // Render success state
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-0">
            <div className="p-8 sm:p-12">
              <SuccessMessage date={selectedDate} slot={selectedSlot} />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Render booking form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl border-0">
          <div className="p-8 sm:p-12">
            {/* Header */}
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Book an Appointment
              </h1>
              <p className="text-lg text-gray-600">
                Select a convenient time for your consultation
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* STEP 1: Date Picker */}
              <div className="space-y-3">
                <Label
                  htmlFor="appointment-date"
                  className="text-base font-medium text-gray-900"
                >
                  Select a Date
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <input
                  id="appointment-date"
                  type="date"
                  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                  onChange={handleDateChange}
                  min={minDate}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-describedby="date-help"
                />
                <p
                  id="date-help"
                  className="text-sm text-gray-600"
                >
                  Choose a date at least one day from today
                </p>
              </div>

              {/* STEP 2: Time Slots (shown after date selected) */}
              {selectedDate && (
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-900">
                    Select a Time
                    <span className="text-red-500 ml-1">*</span>
                  </Label>

                  {slotsLoading && <LoadingSlots />}

                  {slotsError && (
                    <ErrorAlert message={slotsError} />
                  )}

                  {!slotsLoading && slots.length > 0 && (
                    <TimeSlotsGrid
                      slots={slots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                    />
                  )}

                  {!slotsLoading && !slotsError && slots.length === 0 && (
                    <p className="text-gray-600 py-6 text-center">
                      No slots available for this date. Please try another date.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 3: Booking Form (shown after slot selected) */}
              {selectedSlot && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Selected appointment:</strong> {selectedDate?.toLocaleDateString('pl-PL')} at{' '}
                      {new Date(selectedSlot.start).toLocaleTimeString('pl-PL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Name Field */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="client-name"
                        className="text-base font-medium text-gray-900"
                      >
                        Your Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="client-name"
                        type="text"
                        placeholder="John Doe"
                        {...register('clientName')}
                        aria-invalid={errors.clientName ? 'true' : 'false'}
                        className={errors.clientName ? 'border-red-500' : ''}
                      />
                      {errors.clientName && (
                        <p
                          className="text-sm text-red-500"
                          role="alert"
                        >
                          {errors.clientName.message}
                        </p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="client-email"
                        className="text-base font-medium text-gray-900"
                      >
                        Email Address
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="client-email"
                        type="email"
                        placeholder="you@example.com"
                        {...register('clientEmail')}
                        aria-invalid={errors.clientEmail ? 'true' : 'false'}
                        className={errors.clientEmail ? 'border-red-500' : ''}
                      />
                      {errors.clientEmail && (
                        <p
                          className="text-sm text-red-500"
                          role="alert"
                        >
                          {errors.clientEmail.message}
                        </p>
                      )}
                    </div>

                    {/* Notes Field (Optional) */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="appointment-notes"
                        className="text-base font-medium text-gray-900"
                      >
                        Additional Notes (Optional)
                      </Label>
                      <textarea
                        id="appointment-notes"
                        rows={4}
                        placeholder="Tell us about your case or any special requests..."
                        {...register('notes')}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.notes ? 'border-red-500' : 'border-gray-300'
                        }`}
                        aria-invalid={errors.notes ? 'true' : 'false'}
                      />
                      {errors.notes && (
                        <p
                          className="text-sm text-red-500"
                          role="alert"
                        >
                          {errors.notes.message}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Submission Error Alert */}
              {submitError && (
                <ErrorAlert message={submitError} />
              )}

              {/* Submit Button (only enabled when slot selected) */}
              {selectedSlot && (
                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Confirming Appointment...
                      </span>
                    ) : (
                      'Confirm Appointment'
                    )}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
