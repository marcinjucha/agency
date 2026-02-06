# Legal Hub: Calendar Integration Critical Fixes

> **📌 Context:** Legal Hub (project name: legal-mind) is a SaaS platform for Polish law firms to streamline client intake through surveys and calendar booking.
>
> **Current Status:** Phase 4 Complete ✅ (80% overall progress). Calendar booking UI exists but **events are NOT being created in Google Calendar**.
>
> **Product Name:** Legal Hub (not LegalMind - that's a different product from the Product Charter)
>
> **Last Updated:** 2026-01-21
> **Priority:** 🔴 CRITICAL - Blocks production launch

---

## 🔴 Problem Diagnosis

### What's Working ✅
- Google OAuth integration is configured
- Lawyer can connect Google Calendar account
- Client can view available time slots
- Booking UI displays correctly
- Appointments save to database

### What's NOT Working ❌

#### 1. **Events NOT Created in Google Calendar** (CRITICAL)
**File:** `apps/website/app/api/calendar/book/route.ts:180-202`

**Current Code:**
```typescript
// Step 5: Create Google Calendar event (mocked for now)
let googleEventId: string | null = null

try {
  // In production, this would call Google Calendar API
  // For now, using mock event ID (matches mock mode in events.ts)
  googleEventId = `mock_event_${newAppointment.id}_${Date.now()}`

  // ❌ PROBLEM: No actual call to createEvent() function!
  // ❌ Result: Event saved in DB but NOT in Google Calendar
```

**Impact:**
- Appointment exists in Legal Hub database ✅
- Lawyer's Google Calendar shows NOTHING ❌
- Lawyer has no visibility of booked appointments
- System is unusable for production

**Root Cause:**
The booking API generates a fake event ID but never calls the `createEvent()` function from `apps/cms/lib/google-calendar/events.ts`.

---

#### 2. **No Token Refresh Logic** (CRITICAL)
**Files:**
- `apps/cms/lib/google-calendar/oauth.ts` - has `refreshAccessToken()` function
- `apps/website/app/api/calendar/book/route.ts` - does NOT use it

**Current Code:**
```typescript
// Booking API just uses token as-is
const lawyer = await supabase
  .from('users')
  .select('google_calendar_token')
  .eq('id', lawyerId)
  .single()

// ❌ PROBLEM: No check if token is expired
// ❌ PROBLEM: No refresh before API call
```

**Impact:**
- Google access tokens expire after 1 hour
- After 1 hour, all booking attempts will fail with 401 Unauthorized
- No automatic recovery mechanism
- Lawyer would need to manually reconnect calendar

**Root Cause:**
Missing token validation and refresh wrapper before calling Google Calendar API.

---

#### 3. **No Cancel/Reschedule Functionality** (HIGH PRIORITY)
**Current State:**
- No Server Actions in `apps/cms/features/appointments/actions.ts` (file doesn't exist)
- No cancel/reschedule buttons in CMS UI
- No client-facing cancel/reschedule page
- Appointments are permanent once created

**Impact:**
- Client cannot change their mind → support burden
- Lawyer cannot cancel from CMS → manual Google Calendar editing
- No-show appointments stay as "scheduled" forever
- No status management workflow

**Missing:**
- Server Actions: `cancelAppointment()`, `rescheduleAppointment()`, `updateAppointmentStatus()`
- CMS UI: Action buttons + confirmation dialogs
- Client page: `/appointments/[id]/cancel` or `/appointments/[id]/reschedule`
- Google Calendar sync: Cancel/update events when DB changes

---

#### 4. **No Calendar Sync Mechanism** (FUTURE - not critical for MVP)
**Current State:**
- One-way sync: Legal Hub → Google Calendar (when it works)
- No webhook from Google to Legal Hub
- No periodic sync job

**Potential Issues:**
- Lawyer cancels appointment in Google Calendar → Legal Hub still shows "scheduled"
- Lawyer reschedules in Google Calendar → Legal Hub has wrong time
- Data inconsistency between systems

**Note:** This is NOT critical for MVP. Can be added in Phase 6 after core functionality works.

---

## 🎯 Implementation Plan

### Priority 1: Fix Event Creation (1-2 days)
**Goal:** Make appointments actually appear in lawyer's Google Calendar

#### Step 1.1: Create Token Refresh Helper
**New File:** `apps/cms/lib/google-calendar/token-manager.ts`

**Purpose:**
- Check if token is expired (< 5 min remaining)
- Auto-refresh if needed
- Update token in database
- Return fresh access token

**Interface:**
```typescript
export async function getValidAccessToken(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  accessToken: string;
  error?: string
}>
```

**Logic:**
1. Fetch `google_calendar_token` from users table
2. Check `expiry_date` field
3. If expired or expiring soon (< 5 min):
   - Call `refreshAccessToken(refresh_token)`
   - Update database with new token + expiry
4. Return fresh access token

**Files to Create/Modify:**
- ✅ Create: `apps/cms/lib/google-calendar/token-manager.ts`
- ✅ Use in: `apps/website/app/api/calendar/book/route.ts`
- ✅ Use in: `apps/website/app/api/calendar/slots/route.ts`

---

#### Step 1.2: Fix Booking API to Create Real Events
**File:** `apps/website/app/api/calendar/book/route.ts`

**Changes:**
Replace lines 180-202 with:

```typescript
// Step 5: Create Google Calendar event
let googleEventId: string | null = null

try {
  // Get fresh access token with auto-refresh
  const { accessToken, error: tokenError } = await getValidAccessToken(
    lawyerId,
    supabase
  )

  if (tokenError || !accessToken) {
    console.error('Failed to get valid access token:', tokenError)
    // Don't fail the booking - appointment already created in DB
    // Lawyer can manually add to calendar or we'll retry later
  } else {
    // Import createEvent from events.ts
    const { createEvent } = await import('@/lib/google-calendar/events')

    // Create actual Google Calendar event
    googleEventId = await createEvent(accessToken, {
      summary: `Konsultacja: ${validatedData.clientName}`,
      description: `
        Klient: ${validatedData.clientName}
        Email: ${validatedData.clientEmail}

        Notatki:
        ${validatedData.notes || '(brak)'}

        ---
        Utworzone przez Legal Hub
      `.trim(),
      start: {
        dateTime: validatedData.startTime,
        timeZone: 'Europe/Warsaw',
      },
      end: {
        dateTime: validatedData.endTime,
        timeZone: 'Europe/Warsaw',
      },
      attendees: [{ email: validatedData.clientEmail }],
    })

    console.log('[BOOKING] Google Calendar event created:', googleEventId)
  }

  // Update appointment with Google Calendar event ID
  if (googleEventId) {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ google_calendar_event_id: googleEventId })
      .eq('id', newAppointment.id)

    if (updateError) {
      console.error('[BOOKING] Failed to update appointment with event ID:', updateError)
      // Don't fail - the appointment and calendar event are created
    }
  }
} catch (error) {
  console.error('[BOOKING] Error creating Google Calendar event:', error)
  // Don't fail the booking - appointment is already in database
  // Log for monitoring and manual intervention if needed
}
```

**Key Points:**
- ✅ Uses token manager to get fresh token
- ✅ Calls actual `createEvent()` function
- ✅ Handles errors gracefully (doesn't fail booking if calendar fails)
- ✅ Logs for debugging
- ✅ Updates database with real event ID

**Files to Modify:**
- ✅ `apps/website/app/api/calendar/book/route.ts` (lines 180-202)
- ✅ Import token manager
- ✅ Import createEvent function

---

#### Step 1.3: Fix Slots API to Use Token Refresh
**File:** `apps/website/app/api/calendar/slots/route.ts`

**Changes:**
Add token refresh before fetching calendar events:

```typescript
// Get fresh access token with auto-refresh
const { accessToken, error: tokenError } = await getValidAccessToken(
  lawyer.id,
  supabase
)

if (tokenError || !accessToken) {
  return NextResponse.json(
    { error: 'Failed to access calendar', code: 'CALENDAR_ACCESS_FAILED' },
    { status: 500 }
  )
}

// Use fresh token to fetch events
const events = await getEvents(accessToken, startOfDay, endOfDay)
```

**Files to Modify:**
- ✅ `apps/website/app/api/calendar/slots/route.ts`

---

#### Step 1.4: Testing Plan
**Test Scenarios:**

1. **Happy Path - Fresh Token:**
   - Lawyer connected Google Calendar < 1h ago
   - Client books appointment
   - ✅ Appointment in database
   - ✅ Event appears in Google Calendar
   - ✅ Event has correct time, client name, email

2. **Expired Token - Auto Refresh:**
   - Manually set token expiry to past date in DB
   - Client books appointment
   - ✅ Token auto-refreshes
   - ✅ Event created successfully
   - ✅ New token saved to database

3. **Google API Failure - Graceful Degradation:**
   - Disconnect internet or use invalid credentials
   - Client books appointment
   - ✅ Appointment still saved to database
   - ✅ User gets success message
   - ✅ Error logged for manual intervention

4. **Multiple Bookings - Token Reuse:**
   - Client A books → token refreshed
   - Client B books < 1h later
   - ✅ Token reused (not refreshed again)
   - ✅ Both events created

**Test Checklist:**
- [ ] Fresh token scenario works
- [ ] Expired token auto-refreshes
- [ ] Events appear in Google Calendar
- [ ] Event details are correct (time, client name, description)
- [ ] Error handling doesn't break booking flow
- [ ] Multiple bookings work without issues

---

### Priority 2: Add Cancel/Reschedule (2-3 days)
**Goal:** Allow lawyers and clients to manage appointments

#### Step 2.1: Create Appointment Actions
**New File:** `apps/cms/features/appointments/actions.ts`

**Server Actions to Create:**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { deleteEvent } from '@/lib/google-calendar/events'
import { getValidAccessToken } from '@/lib/google-calendar/token-manager'

/**
 * Cancel an appointment
 * Updates status in DB + deletes event from Google Calendar
 */
export async function cancelAppointment(appointmentId: string): Promise<{
  success: boolean
  error?: string
}> {
  // 1. Auth check
  // 2. Fetch appointment (verify ownership)
  // 3. Get fresh access token
  // 4. Delete Google Calendar event
  // 5. Update appointment status to 'cancelled'
  // 6. Revalidate path
  // 7. Return success
}

/**
 * Reschedule an appointment to new date/time
 * Updates DB + updates Google Calendar event
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<{
  success: boolean
  error?: string
}> {
  // 1. Auth check
  // 2. Fetch appointment (verify ownership)
  // 3. Validate new time slot (check conflicts)
  // 4. Get fresh access token
  // 5. Update Google Calendar event
  // 6. Update appointment in database
  // 7. Revalidate path
  // 8. Return success
}

/**
 * Update appointment status (completed, no_show, etc.)
 * Does NOT modify Google Calendar event
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
): Promise<{
  success: boolean
  error?: string
}> {
  // 1. Auth check
  // 2. Fetch appointment (verify ownership)
  // 3. Update status in database
  // 4. Revalidate path
  // 5. Return success
}
```

**Files to Create:**
- ✅ `apps/cms/features/appointments/actions.ts`

**Files to Modify:**
- ✅ `apps/cms/lib/google-calendar/events.ts` - ensure `updateEvent()` and `deleteEvent()` are exported and work correctly

---

#### Step 2.2: Add CMS UI Actions
**File:** `apps/cms/features/appointments/components/AppointmentList.tsx`

**Changes:**
- Add action buttons to each row (Cancel, Mark Complete, Mark No-Show)
- Add confirmation Dialog component
- Handle optimistic updates with TanStack Query
- Show loading states during actions

**UI Components:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleMarkComplete(id)}>
      Mark Complete
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleMarkNoShow(id)}>
      Mark No-Show
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleCancel(id)}>
      Cancel Appointment
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Files to Modify:**
- ✅ `apps/cms/features/appointments/components/AppointmentList.tsx`
- ✅ Add confirmation Dialog (use existing shadcn/ui components from `@agency/ui`)

---

#### Step 2.3: Add Client Cancel Page (Optional for MVP)
**New Route:** `apps/website/app/appointments/[id]/cancel/page.tsx`

**Features:**
- Token-based authentication (appointment ID in URL is UUID, hard to guess)
- Show appointment details
- Confirm cancellation form
- Call API endpoint to cancel
- Show success message

**Note:** This can be Phase 5+ if time-constrained. Lawyers can always cancel from CMS.

**Files to Create:**
- ✅ `apps/website/app/appointments/[id]/cancel/page.tsx`
- ✅ `apps/website/app/api/appointments/[id]/cancel/route.ts` (API endpoint)

---

#### Step 2.4: Testing Plan
**Test Scenarios:**

1. **Cancel from CMS:**
   - Lawyer cancels appointment
   - ✅ Status changes to "cancelled" in database
   - ✅ Event deleted from Google Calendar
   - ✅ UI updates immediately

2. **Mark Complete:**
   - Lawyer marks appointment as complete
   - ✅ Status changes in database
   - ✅ Google Calendar event stays (for history)
   - ✅ UI updates

3. **Mark No-Show:**
   - Client doesn't show up
   - ✅ Lawyer marks as no-show
   - ✅ Status changes in database
   - ✅ Event stays in calendar (with updated status?)

4. **Error Handling:**
   - Google API fails during cancel
   - ✅ Graceful error message
   - ✅ Status still updates in DB
   - ✅ Manual intervention possible

**Test Checklist:**
- [ ] Cancel works from CMS
- [ ] Mark Complete works
- [ ] Mark No-Show works
- [ ] Events deleted from Google Calendar
- [ ] UI updates immediately (optimistic)
- [ ] Error handling works gracefully

---

### Priority 3: Token Management Best Practices (1 day)
**Goal:** Ensure reliable token handling across all Google Calendar operations

#### Step 3.1: Add Token Expiry Monitoring
**Enhancement:** `apps/cms/lib/google-calendar/token-manager.ts`

**Add:**
- Log warning if refresh token is missing
- Log info when token is refreshed
- Return metadata (was refreshed? expiry time?)

**Files to Modify:**
- ✅ `apps/cms/lib/google-calendar/token-manager.ts`

---

#### Step 3.2: Add Reconnect UI in CMS
**File:** `apps/cms/app/admin/settings/calendar/page.tsx`

**Enhancement:**
- Show token expiry time
- Warning if refresh token is missing
- "Reconnect Calendar" button if token invalid

**Files to Modify:**
- ✅ `apps/cms/app/admin/settings/calendar/page.tsx`
- ✅ Add status check to display

---

## 📋 Implementation Checklist

### Phase 1: Event Creation ✅ (CRITICAL)
- [ ] Create `apps/cms/lib/google-calendar/token-manager.ts`
  - [ ] `getValidAccessToken()` function
  - [ ] Token expiry check logic
  - [ ] Auto-refresh on expiry
  - [ ] Database update on refresh
  - [ ] Error handling
  - [ ] Unit tests

- [ ] Update `apps/website/app/api/calendar/book/route.ts`
  - [ ] Import token manager
  - [ ] Import createEvent function
  - [ ] Replace mock code with real Google Calendar API call
  - [ ] Add error handling
  - [ ] Add logging
  - [ ] Test with real Google Calendar

- [ ] Update `apps/website/app/api/calendar/slots/route.ts`
  - [ ] Import token manager
  - [ ] Use token refresh before getEvents()
  - [ ] Handle token errors gracefully

- [ ] Testing
  - [ ] Fresh token scenario
  - [ ] Expired token auto-refresh
  - [ ] Events appear in Google Calendar
  - [ ] Event details correct
  - [ ] Error handling works
  - [ ] Multiple bookings work

### Phase 2: Cancel/Reschedule ✅ (HIGH)
- [ ] Create `apps/cms/features/appointments/actions.ts`
  - [ ] `cancelAppointment()` Server Action
  - [ ] `rescheduleAppointment()` Server Action
  - [ ] `updateAppointmentStatus()` Server Action
  - [ ] Error handling
  - [ ] Revalidation logic

- [ ] Update `apps/cms/features/appointments/components/AppointmentList.tsx`
  - [ ] Add action dropdown menu
  - [ ] Add confirmation dialogs
  - [ ] Hook up Server Actions
  - [ ] Optimistic updates
  - [ ] Loading states
  - [ ] Error toasts

- [ ] Create client cancel page (optional for MVP)
  - [ ] `apps/website/app/appointments/[id]/cancel/page.tsx`
  - [ ] `apps/website/app/api/appointments/[id]/cancel/route.ts`
  - [ ] Token-based auth
  - [ ] Confirmation UI

- [ ] Verify `deleteEvent()` and `updateEvent()` work
  - [ ] Test deleting events from Google Calendar
  - [ ] Test updating event times
  - [ ] Handle API errors

- [ ] Testing
  - [ ] Cancel from CMS works
  - [ ] Mark complete works
  - [ ] Mark no-show works
  - [ ] Google Calendar sync works
  - [ ] Optimistic UI updates work
  - [ ] Error handling works

### Phase 3: Token Management ✅ (MEDIUM)
- [ ] Enhance token manager
  - [ ] Add logging
  - [ ] Add monitoring
  - [ ] Return metadata
  - [ ] Handle edge cases

- [ ] Update calendar settings page
  - [ ] Show token status
  - [ ] Show expiry time
  - [ ] Add reconnect button
  - [ ] Warn if refresh token missing

- [ ] Testing
  - [ ] Token status displays correctly
  - [ ] Reconnect works
  - [ ] Warnings show appropriately

---

## 🚫 Out of Scope (Future Phase)

### Calendar Sync (Phase 6+)
Not critical for MVP. Can add later:
- Google Calendar webhook integration
- Periodic sync job (every 15 min)
- Handle external changes (lawyer edits in Google Calendar)
- Conflict resolution UI

**Rationale:**
- One-way sync (Legal Hub → Google) is sufficient for MVP
- Most lawyers will manage appointments through Legal Hub CMS
- External edits are rare edge case
- Can add if becomes problem in production

---

## 📊 Effort Estimate

| Priority | Task | Effort | Blockers |
|----------|------|--------|----------|
| 🔴 P1 | Event Creation Fix | 1-2 days | None - can start immediately |
| 🟠 P2 | Cancel/Reschedule | 2-3 days | Depends on P1 completion |
| 🟡 P3 | Token Management | 1 day | Can run parallel to P2 |
| **Total** | **Critical Path** | **4-6 days** | **None** |

---

## 🎯 Success Criteria

### Must Have (MVP Launch):
- ✅ Appointments create real events in Google Calendar
- ✅ Events have correct time, client name, description
- ✅ Access tokens auto-refresh when expired
- ✅ Lawyers can cancel appointments from CMS
- ✅ Status updates work (complete, no-show, cancelled)
- ✅ Error handling prevents booking failures

### Nice to Have (Phase 5+):
- ⏳ Clients can cancel their own appointments
- ⏳ Reschedule functionality
- ⏳ Calendar sync from Google → Legal Hub
- ⏳ Reminder emails before appointments
- ⏳ Time zone handling for international clients

---

## 🚀 Next Steps

1. **Review this plan** with team/stakeholders
2. **Create todo in Notion:** Add "Legal Hub - Calendar Critical Fixes" to Agency Projects (🔴 Critical)
3. **Start with P1:** Create token manager + fix booking API
4. **Test thoroughly:** Use real Google Calendar account
5. **Deploy to staging:** Test end-to-end flow
6. **Fix P2:** Add cancel/reschedule after P1 works
7. **Deploy to production:** Monitor logs for issues

---

## 📝 Related Documents

- `PROJECT_SPEC.yaml` - Overall project spec (shows Phase 3 as complete, but calendar events not actually working)
- `PROJECT_ROADMAP.md` - Main project roadmap (update after fixes)
- `ARCHITECTURE.md` - Technical architecture
- `.claude/agents/n8n-infrastructure-expert.md` - For Phase 5 n8n setup (after calendar works)

---

## 🎓 Lessons Learned

### Why This Happened:
1. **Mock mode left enabled** - `USE_MOCK_CALENDAR = true` in events.ts
2. **Incomplete implementation** - Booking API had TODO comments but never called real functions
3. **Missing token refresh** - Didn't anticipate 1-hour token expiry
4. **No integration testing** - Unit tests passed but end-to-end flow wasn't tested with real Google Calendar

### Prevention for Future:
1. **Always test with real APIs** - Don't rely on mocks for critical integrations
2. **Check TODO comments before marking feature complete** - Grep for TODO/FIXME/MOCK
3. **E2E testing** - Test full user journey including external APIs
4. **Token management from day 1** - Always assume OAuth tokens expire

---

**Questions? Issues during implementation?**
Update this document with findings and solutions as you work through the fixes.
