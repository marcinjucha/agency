# Calendar Booking Component - Code Reference

## Quick Copy-Paste Code Snippets

### 1. Import the Component

```typescript
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'
```

### 2. Basic Usage (Minimal Props)

```typescript
<CalendarBooking
  surveyId="survey-uuid-here"
  responseId="response-uuid-here"
/>
```

### 3. Full Usage (All Props)

```typescript
<CalendarBooking
  surveyId="123e4567-e89b-12d3-a456-426614174000"
  responseId="550e8400-e29b-41d4-a716-446655440000"
  lawyerEmail="john@example.com"
/>
```

### 4. In a Page Component with Survey Form

```typescript
'use client'

import { useState } from 'react'
import { SurveyForm } from '@/features/survey/components/SurveyForm'
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'

export default function SurveyPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<'form' | 'booking'>('form')
  const [surveyData, setSurveyData] = useState<{
    surveyId: string
    responseId: string
  } | null>(null)

  if (step === 'form') {
    return (
      <SurveyForm
        token={params.token}
        onSubmitSuccess={(responseId, surveyId) => {
          setSurveyData({ surveyId, responseId })
          setStep('booking')
        }}
      />
    )
  }

  if (!surveyData) return null

  return (
    <CalendarBooking
      surveyId={surveyData.surveyId}
      responseId={surveyData.responseId}
    />
  )
}
```

## Internal Component Structure

### Main Component Signature

```typescript
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
  // Implementation
}
```

### Validation Schema (Zod)

```typescript
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
    .or(z.literal('')),
})

type BookingFormData = z.infer<typeof bookingFormSchema>
```

### Form Hook Setup

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<BookingFormData>({
  resolver: zodResolver(bookingFormSchema),
  mode: 'onBlur', // Validate when user leaves field
})
```

### Date Change Handler

```typescript
const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const dateValue = e.target.value
  if (!dateValue) {
    setSelectedDate(null)
    return
  }

  const date = new Date(dateValue)
  setSelectedDate(date)
  setSelectedSlot(null)
  setSlotsError(null)
  setSlotsLoading(true)

  try {
    const dateStr = dateValue // YYYY-MM-DD format
    const params = new URLSearchParams({
      surveyId,
      date: dateStr,
    })
    if (lawyerEmail) {
      params.append('lawyerEmail', lawyerEmail)
    }

    const response = await fetch(`/api/calendar/slots?${params.toString()}`)

    if (!response.ok) {
      setSlotsError('Failed to load available times')
      setSlots([])
      return
    }

    const data = await response.json()

    if (!data.slots || data.slots.length === 0) {
      setSlotsError('No available times for this date')
      setSlots([])
    } else {
      setSlots(data.slots)
    }
  } catch (error) {
    console.error('Error fetching calendar slots:', error)
    setSlotsError('Unable to load times')
  } finally {
    setSlotsLoading(false)
  }
}
```

### Booking Submission Handler

```typescript
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
      setSubmitError(result.error || 'Booking failed')
    }
  } catch (error) {
    console.error('Booking submission error:', error)
    setSubmitError('An unexpected error occurred')
  } finally {
    setIsSubmitting(false)
  }
}
```

## API Integration Examples

### Fetch Slots API Call

```typescript
// GET request to fetch available time slots
const response = await fetch(
  `/api/calendar/slots?surveyId=${surveyId}&date=${dateStr}`
)
const data = await response.json()

// Expected response structure:
// {
//   slots: [
//     { start: "2025-01-20T10:00:00Z", end: "2025-01-20T11:00:00Z" },
//     { start: "2025-01-20T11:00:00Z", end: "2025-01-20T12:00:00Z" },
//     ...
//   ]
// }
```

### Book Appointment API Call

```typescript
// POST request to create booking
const response = await fetch('/api/calendar/book', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    surveyId: 'uuid',
    responseId: 'uuid',
    startTime: '2025-01-20T10:00:00Z',
    endTime: '2025-01-20T11:00:00Z',
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    notes: 'I have concerns about...',
    lawyerEmail: 'lawyer@example.com',
  }),
})
const result = await response.json()

// Expected response:
// { success: true }
// or
// { success: false, error: "Error message" }
```

## UI Component Examples

### Date Picker Input

```typescript
<input
  id="appointment-date"
  type="date"
  value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
  onChange={handleDateChange}
  min={minDate}
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

### Time Slots Grid

```typescript
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
        onClick={() => setSelectedSlot(slot)}
        className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
          isSelected
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-900 border-gray-300 hover:border-blue-400'
        }`}
        type="button"
      >
        {timeString}
      </button>
    )
  })}
</div>
```

### Form Input with Error

```typescript
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
    <p className="text-sm text-red-500" role="alert">
      {errors.clientName.message}
    </p>
  )}
</div>
```

### Success Message

```typescript
<div className="text-center py-12">
  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
  <h2 className="text-3xl font-bold text-gray-900 mb-3">
    Appointment Confirmed!
  </h2>
  <p className="text-gray-600 mb-8">
    Your appointment has been successfully booked.
  </p>
  <div className="bg-gray-50 rounded-lg p-6 max-w-sm mx-auto">
    <div className="flex items-center gap-3">
      <Calendar className="h-5 w-5 text-blue-600" />
      <div>
        <p className="text-sm text-gray-600">Date</p>
        <p className="font-semibold text-gray-900">{formattedDate}</p>
      </div>
    </div>
    <div className="flex items-center gap-3 mt-4">
      <Clock className="h-5 w-5 text-blue-600" />
      <div>
        <p className="text-sm text-gray-600">Time</p>
        <p className="font-semibold text-gray-900">{formattedTime}</p>
      </div>
    </div>
  </div>
</div>
```

### Error Alert

```typescript
<div
  className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3"
  role="alert"
>
  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
  <div>
    <p className="font-medium">Error</p>
    <p className="text-sm">{error.message}</p>
  </div>
</div>
```

## State Management Patterns

### Managing Multi-Step Flow

```typescript
// Step 1: Date Selection
const [selectedDate, setSelectedDate] = useState<Date | null>(null)

// Step 2: Time Slot Loading
const [slotsLoading, setSlotsLoading] = useState(false)
const [slots, setSlots] = useState<CalendarSlot[]>([])
const [slotsError, setSlotsError] = useState<string | null>(null)

// Step 3: Time Slot Selection
const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)

// Step 4: Form Submission
const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)

// Step 5: Success
const [bookingSuccess, setBookingSuccess] = useState(false)
```

### Conditional Rendering Based on State

```typescript
// Show success screen if booking successful
if (bookingSuccess) {
  return <SuccessMessage date={selectedDate} slot={selectedSlot} />
}

// Show date picker always
// <input type="date" ... />

// Show time slots only after date selected
{selectedDate && (
  <TimeSlotsGrid
    slots={slots}
    selectedSlot={selectedSlot}
    onSelectSlot={setSelectedSlot}
  />
)}

// Show booking form only after slot selected
{selectedSlot && (
  // Form JSX here
)}
```

## Localization Examples (Polish)

### Date Formatting

```typescript
// Format to Polish date (e.g., "poniedziałek, 20 stycznia 2025")
const formattedDate = date.toLocaleDateString('pl-PL', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// Output: "poniedziałek, 20 stycznia 2025"
```

### Time Formatting

```typescript
// Format to Polish time (e.g., "10:30")
const formattedTime = date.toLocaleTimeString('pl-PL', {
  hour: '2-digit',
  minute: '2-digit',
})

// Output: "10:30"
```

## Testing Utilities

### Mock API Responses

```typescript
// Mock successful slots response
const mockSlotsResponse = {
  slots: [
    { start: '2025-01-20T10:00:00Z', end: '2025-01-20T11:00:00Z' },
    { start: '2025-01-20T11:00:00Z', end: '2025-01-20T12:00:00Z' },
    { start: '2025-01-20T14:00:00Z', end: '2025-01-20T15:00:00Z' },
  ],
}

// Mock successful booking response
const mockBookingResponse = {
  success: true,
}

// Mock error response
const mockErrorResponse = {
  success: false,
  error: 'Slot no longer available',
}
```

## Type Definitions

```typescript
// Slot structure
interface CalendarSlot {
  start: string // ISO 8601 datetime
  end: string   // ISO 8601 datetime
}

// Booking form data
type BookingFormData = {
  clientName: string
  clientEmail: string
  notes?: string
}

// Component props
interface CalendarBookingProps {
  surveyId: string
  responseId: string
  lawyerEmail?: string
}
```

---

**Note:** All code snippets are copy-paste ready from the actual implementation in
`apps/website/features/survey/components/CalendarBooking.tsx`
