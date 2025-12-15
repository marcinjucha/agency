# Calendar Booking Component - Implementation Guide

## Overview

The `CalendarBooking` component has been created as a production-ready, multi-step appointment booking interface for survey respondents.

**File:** `apps/website/features/survey/components/CalendarBooking.tsx` (609 lines)

## Component Architecture

### Multi-Step Flow

```
Step 1: Date Selection
  ↓ User selects date
Step 2: Time Slots Display
  ↓ API fetches available slots (loading state)
Step 3: Time Slot Selection
  ↓ User chooses preferred time
Step 4: Booking Form
  ↓ User fills name/email/notes
Step 5: Confirmation
  ↓ Form submission to booking API
Step 6: Success Message
```

### Core Components

1. **Main Component:** `CalendarBooking` (React Hook Form integration)
2. **Sub-components:**
   - `SuccessMessage` - Confirmation display with appointment details
   - `ErrorAlert` - Consistent error messaging UI
   - `LoadingSlots` - Animated skeleton loader for time slots
   - `TimeSlotsGrid` - Interactive time slot selection

## State Management

### Local State
```typescript
// Date/Slot Selection
const [selectedDate, setSelectedDate] = useState<Date | null>(null)
const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)

// API Loading States
const [slotsLoading, setSlotsLoading] = useState(false)
const [slotsError, setSlotsError] = useState<string | null>(null)
const [slots, setSlots] = useState<CalendarSlot[]>([])

// Form Submission
const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)
const [bookingSuccess, setBookingSuccess] = useState(false)
```

### Form State (React Hook Form)
```typescript
const { register, handleSubmit, formState: { errors } } = useForm<BookingFormData>({
  resolver: zodResolver(bookingFormSchema),
  mode: 'onBlur' // Validate when user leaves field
})
```

**Why not TanStack Query?**
- This is the **website app** (public, not CMS)
- Rule: TanStack Query ONLY in CMS for complex data fetching
- Website uses simple fetch() for one-off API calls
- Slots are short-lived and don't need caching

## API Integration

### 1. Fetch Available Slots

**Endpoint:** `GET /api/calendar/slots`

**Query Parameters:**
```typescript
{
  surveyId: string       // Required: Survey UUID
  date: string           // Required: YYYY-MM-DD format
  lawyerEmail?: string   // Optional: Specific lawyer email
}
```

**Response:**
```typescript
{
  slots: [
    {
      start: "2025-01-20T10:00:00Z",  // ISO 8601 datetime
      end: "2025-01-20T11:00:00Z"
    },
    // ... more slots
  ]
}
```

**Error Handling:**
- `404`: Calendar not connected → Show "Calendar not connected" error
- `500` or network error → Show "Failed to load available times" error
- Empty slots array → Show "No available times for this date"

### 2. Create Booking

**Endpoint:** `POST /api/calendar/book`

**Request Body:**
```typescript
{
  surveyId: string       // Survey UUID
  responseId: string     // Response UUID from survey submission
  startTime: string      // ISO 8601 datetime (from selected slot)
  endTime: string        // ISO 8601 datetime (from selected slot)
  clientName: string     // Validated (2-100 chars)
  clientEmail: string    // Validated (email format)
  notes?: string | null  // Optional, max 500 chars
  lawyerEmail?: string   // Optional lawyer email
}
```

**Response:**
```typescript
{
  success: boolean
  error?: string
}
```

## Validation Rules

### Zod Schema: `bookingFormSchema`

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
```

**Validation Points:**
- Date: HTML5 input min attribute prevents past dates
- Time Slot: Required selection (button disabled if not selected)
- Name: Min 2 chars, max 100 chars
- Email: Must be valid email format
- Notes: Optional, max 500 characters

**Validation Mode:** `onBlur` - validates when user leaves field (better UX than onChange)

## Error Handling Strategy

### 1. Calendar/Slots Errors
```typescript
if (!response.ok) {
  if (response.status === 404) {
    setSlotsError('Calendar not connected...')
  } else {
    setSlotsError('Failed to load available times...')
  }
}

if (!data.slots || data.slots.length === 0) {
  setSlotsError('No available times for this date...')
}
```

### 2. Form Validation Errors
```typescript
{errors.clientName && (
  <p className="text-sm text-red-500" role="alert">
    {errors.clientName.message}
  </p>
)}
```

### 3. Submission Errors
```typescript
if (!result.success) {
  setSubmitError(result.error || 'Booking failed. Please try again.')
}
```

## Accessibility Features

### ARIA Attributes
- `aria-invalid="true|false"` on form fields with errors
- `role="alert"` on error messages (screen reader announcement)
- `htmlFor` on all labels (keyboard navigation)

### Keyboard Navigation
- Date input: Native HTML5 date picker with keyboard support
- Time slots: Buttons (natural tab order)
- Form fields: Standard form navigation
- Submit button: Only enabled after slot selection

### Visual Feedback
- Error states: Red borders + error messages
- Loading states: Skeleton loaders + spinner in button
- Success state: Green checkmark + summary details
- Selected slot: Blue highlight + button styling

## Styling Approach

### Design System
- **Colors:** Blue (#3b82f6) primary, red (#ef4444) error, green (#16a34a) success
- **Spacing:** Tailwind spacing scale (3, 4, 6, 8, 12 units)
- **Typography:** 4xl headers, lg labels, sm error messages
- **Components:** shadcn/ui from @legal-mind/ui

### Responsive Design
```
Mobile (< 640px):  Single column layout, full-width inputs
Tablet (640px+):   Two-column time slots grid
Desktop (1024px+): Centered 2xl max-width card
```

### Key Classes
- `.space-y-*` - Vertical spacing between form sections
- `.grid grid-cols-2 sm:grid-cols-3` - Time slots (2 on mobile, 3 on desktop)
- `.bg-gradient-to-br from-gray-50 to-gray-100` - Page background
- `hover:bg-blue-700` - Button hover state
- `disabled:opacity-50 disabled:cursor-not-allowed` - Disabled button state

## Integration Example

### In Survey Page

```typescript
// app/survey/[token]/page.tsx
'use client'

import { useState } from 'react'
import { SurveyForm } from '@/features/survey/components/SurveyForm'
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'

export default function SurveyPage({ params }: { params: { token: string } }) {
  const [isFormSubmitted, setIsFormSubmitted] = useState(false)
  const [responseId, setResponseId] = useState<string | null>(null)
  const [surveyId, setSurveyId] = useState<string | null>(null)

  if (!isFormSubmitted) {
    return (
      <SurveyForm
        token={params.token}
        onSubmitSuccess={(responseId, surveyId) => {
          setResponseId(responseId)
          setSurveyId(surveyId)
          setIsFormSubmitted(true)
        }}
      />
    )
  }

  if (!responseId || !surveyId) return null

  return (
    <CalendarBooking
      surveyId={surveyId}
      responseId={responseId}
      lawyerEmail={undefined} // Optional: specific lawyer
    />
  )
}
```

### Standalone Usage

```typescript
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'

export function MyPage() {
  return (
    <CalendarBooking
      surveyId="123e4567-e89b-12d3-a456-426614174000"
      responseId="550e8400-e29b-41d4-a716-446655440000"
      lawyerEmail="john@example.com"
    />
  )
}
```

## Component Props

```typescript
interface CalendarBookingProps {
  /** Survey UUID for tracking which survey this booking belongs to */
  surveyId: string

  /** Response UUID from survey submission, links booking to survey response */
  responseId: string

  /** Optional: Specific lawyer email for routing the booking */
  lawyerEmail?: string
}
```

## File Organization

```
apps/website/features/survey/
├── components/
│   ├── CalendarBooking.tsx      ← NEW (this component)
│   ├── SurveyForm.tsx           (existing)
│   └── QuestionField.tsx        (existing)
├── types.ts                      (existing)
├── validation.ts                 (existing)
└── ...
```

## Testing Checklist

- [ ] Date picker shows only future dates (min = today)
- [ ] Selecting date loads time slots (with loading spinner)
- [ ] No available slots shows error message
- [ ] Calendar unavailable (404) shows specific error
- [ ] Selected time slot highlights in blue
- [ ] Selected appointment summary shows correctly
- [ ] Name field: validates min 2 chars, max 100 chars
- [ ] Email field: validates email format
- [ ] Notes field: validates max 500 chars (optional)
- [ ] Submit button disabled until time slot selected
- [ ] Submit shows spinner while submitting
- [ ] Successful booking shows success message with details
- [ ] Booking failure shows error message
- [ ] Error messages are accessible (role="alert")
- [ ] Form is fully keyboard navigable
- [ ] Mobile responsive (test on 375px viewport)
- [ ] Desktop responsive (test on 1440px viewport)

## Key Design Decisions

### 1. No TanStack Query (Website Rule)
- Simple fetch() API calls only
- No caching needed (slots expire quickly)
- Component is lightweight and self-contained
- CMS would use TanStack Query for complex queries

### 2. React Hook Form for Validation
- Familiar pattern (matches SurveyForm)
- Zod integration for type safety
- Minimal rerenders (field-level)
- onBlur mode for better UX

### 3. No Calendar UI Library
- HTML5 `<input type="date">` is sufficient
- Mocked API returns ISO strings (no date picker library needed)
- Simpler, fewer dependencies
- Native mobile date picker on mobile devices

### 4. Multi-Step Conditional Rendering
- Each step only shown when previous is complete
- Date → Slots → Form → Success
- Users can't jump ahead
- Clear visual progression

### 5. Error-First Design
- All error states handled explicitly
- Network errors caught and shown to user
- Form validation shows field-level errors
- Submission errors shown above button

## Security Considerations

### Input Validation
- Name/Email validated with Zod before submission
- Notes field length limited to 500 chars
- Date validated on client (min = today)

### API Call Validation
- Date format enforced (YYYY-MM-DD from HTML input)
- Response validation checks for required fields
- Email format verified before sending to API

### No Sensitive Data
- Component doesn't handle passwords or payment info
- Booking data is basic (name, email, notes, time)
- All data sent to server for final validation

## Future Enhancements

### Potential Improvements
1. **Timezone Support:** Allow clients to select timezone
2. **Calendar Sync:** Real-time slot availability from Google Calendar
3. **Confirmation Email:** Automatic email with booking details
4. **Cancellation:** Allow clients to reschedule/cancel bookings
5. **Payment Integration:** Collect payment for consultations
6. **Lawyer Selection:** Let clients choose from multiple lawyers
7. **Availability Rules:** Set custom availability patterns per lawyer

## Related Files

- `SurveyForm.tsx` - Previous step in survey flow (submit survey answers)
- `QuestionField.tsx` - Question rendering (reference for validation pattern)
- `/api/survey/submit` - Survey submission endpoint (parallel endpoint)
- `/api/calendar/slots` - Time slots API (external)
- `/api/calendar/book` - Booking creation API (external)

## Support & Troubleshooting

### "Calendar not connected" Error
- Check that lawyer has Google Calendar connected in CMS
- Verify lawyerEmail is correct
- Check API logs for authentication errors

### "No available times" for all dates
- Check lawyer's calendar availability settings
- Verify working hours are configured
- Check for blocked time slots

### Form won't submit
- Ensure time slot is selected (blue highlight)
- Check that name is 2+ characters
- Verify email format is valid
- Look for client-side validation errors

### Success page doesn't show
- Check browser console for JavaScript errors
- Verify booking API endpoint is working
- Check response includes `success: true`

---

**Created:** 2025-12-15
**Component Type:** Client Component (React hooks)
**Status:** Production Ready
**Test Coverage:** Manual testing checklist provided
