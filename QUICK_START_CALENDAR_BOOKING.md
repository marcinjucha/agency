# Calendar Booking Component - Quick Start

## 5-Minute Setup Guide

### 1. Import Component
```typescript
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'
```

### 2. Add to Your Page
```typescript
<CalendarBooking
  surveyId="your-survey-uuid"
  responseId="your-response-uuid"
/>
```

### 3. That's It!
The component handles:
- Date selection
- Time slot fetching from API
- Time slot selection
- Form validation (name/email)
- Booking submission
- Success confirmation

---

## Component Props

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `surveyId` | `string` | Yes | Survey UUID for tracking |
| `responseId` | `string` | Yes | Response UUID from survey submit |
| `lawyerEmail` | `string` | No | Specific lawyer email (optional) |

---

## Required API Endpoints

Your backend must provide:

### 1. GET /api/calendar/slots
Fetch available appointment times

**Query Parameters:**
```
surveyId=abc123
date=2025-01-20
lawyerEmail=john@example.com (optional)
```

**Response:**
```json
{
  "slots": [
    {
      "start": "2025-01-20T10:00:00Z",
      "end": "2025-01-20T11:00:00Z"
    },
    {
      "start": "2025-01-20T11:00:00Z",
      "end": "2025-01-20T12:00:00Z"
    }
  ]
}
```

### 2. POST /api/calendar/book
Create a booking

**Request Body:**
```json
{
  "surveyId": "abc123",
  "responseId": "def456",
  "startTime": "2025-01-20T10:00:00Z",
  "endTime": "2025-01-20T11:00:00Z",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "notes": "I have concerns about...",
  "lawyerEmail": "lawyer@example.com"
}
```

**Response:**
```json
{
  "success": true
}
```

or on error:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Integration Checklist

- [ ] Component file exists: `apps/website/features/survey/components/CalendarBooking.tsx`
- [ ] API endpoint implemented: `GET /api/calendar/slots`
- [ ] API endpoint implemented: `POST /api/calendar/book`
- [ ] CalendarBooking imported in your page
- [ ] surveyId prop passed correctly
- [ ] responseId prop passed correctly
- [ ] lawyerEmail prop passed (if needed)
- [ ] Tested on mobile (375px)
- [ ] Tested on tablet (768px)
- [ ] Tested on desktop (1440px)
- [ ] Error cases tested:
  - [ ] Calendar not connected (404)
  - [ ] No available slots
  - [ ] Network error
  - [ ] Invalid form data
  - [ ] Booking fails

---

## Common Integration Pattern

```typescript
// page.tsx
'use client'

import { useState } from 'react'
import { SurveyForm } from '@/features/survey/components/SurveyForm'
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'

export default function SurveyPage({ params }) {
  const [step, setStep] = useState('form')
  const [surveyData, setSurveyData] = useState(null)

  // Show survey form
  if (step === 'form') {
    return (
      <SurveyForm
        token={params.token}
        onSubmitSuccess={(responseId, surveyId) => {
          setSurveyData({ responseId, surveyId })
          setStep('booking')
        }}
      />
    )
  }

  // Show calendar booking
  if (!surveyData) return null
  return (
    <CalendarBooking
      surveyId={surveyData.surveyId}
      responseId={surveyData.responseId}
    />
  )
}
```

---

## What the Component Does

### Step 1: Date Picker
- User selects a date
- Only allows future dates (min = today)

### Step 2: Time Slots
- Fetches available slots from `/api/calendar/slots`
- Shows loading spinner while fetching
- Displays times in grid (2 cols mobile, 3 cols desktop)
- Shows error if calendar not connected

### Step 3: Slot Selection
- User clicks preferred time
- Selected slot highlights in blue
- Shows appointment summary

### Step 4: Booking Form
- Validates name (2-100 chars)
- Validates email (valid format)
- Accepts optional notes (max 500 chars)
- Shows errors on invalid fields

### Step 5: Confirmation
- Submits to `/api/calendar/book`
- Shows spinner while submitting
- Displays success page with appointment details
- Shows confirmation email message

---

## Styling

### Colors
- **Primary (Blue):** Selected slots, buttons, focus state
- **Error (Red):** Error messages, validation feedback
- **Success (Green):** Success icon, confirmation

### Layout
- **Mobile:** Single column, 2-column slot grid
- **Tablet:** Multi-column, 3-column slot grid
- **Desktop:** Centered max-width card, spacious padding

### Icons (Lucide React)
- Calendar - Date display
- Clock - Time display
- CheckCircle - Success confirmation
- AlertCircle - Error messages

---

## Form Validation Rules

### Name Field
- Minimum: 2 characters
- Maximum: 100 characters
- Required: Yes
- Error: "Name must be at least 2 characters"

### Email Field
- Format: Valid email (RFC 5322)
- Required: Yes
- Error: "Please enter a valid email address"

### Notes Field
- Maximum: 500 characters
- Required: No
- Error: "Notes cannot exceed 500 characters"

---

## Error Handling

### Calendar Not Connected
Shows: "Calendar not connected for this lawyer. Please contact support."
Status: 404 from `/api/calendar/slots`

### No Available Slots
Shows: "No available times for this date. Please choose another."
Status: Empty slots array response

### Network Error
Shows: "Unable to load times. Please check your connection."
Status: Fetch/network error

### Form Validation Error
Shows: Field-specific error message
Status: Zod validation failure

### Booking Failed
Shows: "Booking failed. Please try again." or server error message
Status: `success: false` from `/api/calendar/book`

---

## Accessibility

- Full keyboard navigation (Tab, Enter, Space)
- Screen reader support (role="alert" on errors)
- Proper labels with htmlFor attributes
- ARIA invalid on error fields
- Color contrast meets WCAG AA
- Native HTML5 date picker (mobile-friendly)

---

## Testing

### Quick Test Scenario
1. Open component in browser
2. Select date (e.g., tomorrow)
3. Wait for slots to load
4. Click a time slot
5. Enter name: "Test User"
6. Enter email: "test@example.com"
7. Click "Confirm Appointment"
8. Verify success page shows

### What Success Looks Like
- Date and time display correctly formatted
- Checkmark icon shown
- Confirmation message displayed
- No console errors

---

## Documentation Files

If you need more details:
- **CALENDAR_BOOKING_GUIDE.md** - Comprehensive guide
- **CALENDAR_BOOKING_CODE_SNIPPETS.md** - Code examples
- **CALENDAR_BOOKING_ACCEPTANCE.md** - Acceptance criteria
- **CalendarBooking.tsx** - Inline code documentation

---

## Support

### Common Issues

**"Calendar not connected"**
- Check if lawyer has Google Calendar connected in CMS
- Verify lawyerEmail parameter is correct
- Check API logs for authentication errors

**"No available times"**
- Check lawyer's calendar availability
- Verify working hours configured
- Check for blocked time slots

**Form won't submit**
- Ensure time slot is selected (blue highlight)
- Check name is 2+ characters
- Verify email format is valid

**Mobile date picker not working**
- Component uses native HTML5 date input
- iOS/Android should show native picker
- Desktop shows browser's date picker

---

## Quick Links

**Component File:**
`/Users/marcinjucha/Prywatne/projects/legal-mind/apps/website/features/survey/components/CalendarBooking.tsx`

**Related Components:**
- `SurveyForm.tsx` - Previous step in flow
- `QuestionField.tsx` - Reference for validation pattern

**Project Docs:**
- `ARCHITECTURE.md` - Project structure
- `CODE_PATTERNS.md` - React/Form patterns
- `apps/website/CLAUDE.md` - Website app guide

---

**Version:** 1.0.0
**Created:** 2025-12-15
**Status:** Production Ready
